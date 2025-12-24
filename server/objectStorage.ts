import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { Request } from "express";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Check if we should use local storage (explicit opt-in via env var)
const useLocalStorage = (): boolean => {
  return process.env.USE_LOCAL_STORAGE === "true";
};

// Check if Object Storage is configured (Replit environment)
const hasObjectStorage = (): boolean => {
  return !!process.env.PRIVATE_OBJECT_DIR;
};

// Only initialize GCS client if Object Storage is configured
let objectStorageClient: Storage | null = null;
if (hasObjectStorage() && !useLocalStorage()) {
  objectStorageClient = new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: {
          type: "json",
          subject_token_field_name: "access_token",
        },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });
}

// Local storage directory for VPS deployments
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure local uploads directory exists
const ensureLocalUploadsDir = (folder: string = ""): string => {
  const sanitizedFolder = sanitizePath(folder);
  const dir = path.join(LOCAL_UPLOADS_DIR, sanitizedFolder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Allowed folders for file storage (whitelist)
const ALLOWED_FOLDERS = ["passport-scans", "documents", "attachments"];

// Sanitize path to prevent directory traversal attacks
const sanitizePath = (inputPath: string): string => {
  // Get basename to prevent directory traversal
  const basename = path.basename(inputPath);
  // Remove any potentially dangerous characters
  return basename.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_');
};

// Validate folder is in whitelist
const validateFolder = (folder: string): string => {
  const sanitizedFolder = sanitizePath(folder);
  if (!ALLOWED_FOLDERS.includes(sanitizedFolder)) {
    console.warn(`[Storage] Folder "${folder}" not in whitelist, using "passport-scans"`);
    return "passport-scans";
  }
  return sanitizedFolder;
};

// Validate relative path (for read/delete operations)
const validateRelativePath = (relativePath: string): { folder: string; filename: string } => {
  // Remove leading slash
  const cleanPath = relativePath.replace(/^\/+/, '');
  
  // Split into parts
  const parts = cleanPath.split('/');
  
  if (parts.length !== 2) {
    throw new Error("Invalid file path format");
  }
  
  const folder = validateFolder(parts[0]);
  const filename = sanitizePath(parts[1]);
  
  if (!filename) {
    throw new Error("Invalid filename");
  }
  
  return { folder, filename };
};

export { objectStorageClient };

export class ObjectStorageService {
  private shouldUseLocalStorage(): boolean {
    // Use local storage if explicitly enabled OR if Object Storage is not configured
    return useLocalStorage() || !hasObjectStorage();
  }

  private getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new Error("Invalid path: must contain at least a bucket name");
    }

    const bucketName = pathParts[1];
    const objectName = pathParts.slice(2).join("/");

    return { bucketName, objectName };
  }

  async uploadFile(file: { buffer: Buffer; originalname: string; mimetype: string }, folder: string = "passport-scans"): Promise<string> {
    // Use local storage fallback for VPS
    if (this.shouldUseLocalStorage()) {
      return this.uploadFileLocal(file, folder);
    }

    // Replit Object Storage
    const privateDir = this.getPrivateObjectDir();
    const validatedFolder = validateFolder(folder);
    const timestamp = Date.now();
    const sanitizedName = sanitizePath(file.originalname);
    const filename = `${timestamp}_${sanitizedName}`;
    const objectPath = `${privateDir}/${validatedFolder}/${filename}`;

    const { bucketName, objectName } = this.parseObjectPath(objectPath);
    
    if (!objectStorageClient) {
      throw new Error("Object Storage client not initialized");
    }
    
    const bucket = objectStorageClient.bucket(bucketName);
    const blob = bucket.file(objectName);

    await blob.save(file.buffer, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
      },
    });

    return `/${validatedFolder}/${filename}`;
  }

  private async uploadFileLocal(file: { buffer: Buffer; originalname: string; mimetype: string }, folder: string): Promise<string> {
    const validatedFolder = validateFolder(folder);
    const uploadDir = ensureLocalUploadsDir(validatedFolder);
    const timestamp = Date.now();
    const sanitizedName = sanitizePath(file.originalname);
    const filename = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(uploadDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);
    
    console.log(`[Local Storage] File saved: ${filePath}`);
    return `/${validatedFolder}/${filename}`;
  }

  async deleteFile(relativePath: string): Promise<void> {
    if (this.shouldUseLocalStorage()) {
      return this.deleteFileLocal(relativePath);
    }

    const privateDir = this.getPrivateObjectDir();
    const { folder, filename } = validateRelativePath(relativePath);
    const fullPath = `${privateDir}/${folder}/${filename}`;

    const { bucketName, objectName } = this.parseObjectPath(fullPath);
    
    if (!objectStorageClient) {
      throw new Error("Object Storage client not initialized");
    }
    
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
  }

  private async deleteFileLocal(relativePath: string): Promise<void> {
    const { folder, filename } = validateRelativePath(relativePath);
    const filePath = path.join(LOCAL_UPLOADS_DIR, folder, filename);
    
    // Double-check the resolved path is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const uploadsBase = path.resolve(LOCAL_UPLOADS_DIR);
    if (!resolvedPath.startsWith(uploadsBase)) {
      throw new Error("Invalid file path - directory traversal detected");
    }
    
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log(`[Local Storage] File deleted: ${filePath}`);
    }
  }

  async getFileBuffer(relativePath: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (this.shouldUseLocalStorage()) {
      return this.getFileBufferLocal(relativePath);
    }

    const privateDir = this.getPrivateObjectDir();
    const { folder, filename } = validateRelativePath(relativePath);
    const fullPath = `${privateDir}/${folder}/${filename}`;

    const { bucketName, objectName } = this.parseObjectPath(fullPath);
    
    if (!objectStorageClient) {
      throw new Error("Object Storage client not initialized");
    }
    
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || 'application/octet-stream';

    return { buffer, contentType };
  }

  private async getFileBufferLocal(relativePath: string): Promise<{ buffer: Buffer; contentType: string }> {
    const { folder, filename } = validateRelativePath(relativePath);
    const filePath = path.join(LOCAL_UPLOADS_DIR, folder, filename);
    
    // Double-check the resolved path is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const uploadsBase = path.resolve(LOCAL_UPLOADS_DIR);
    if (!resolvedPath.startsWith(uploadsBase)) {
      throw new Error("Invalid file path - directory traversal detected");
    }
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${relativePath}`);
    }

    const buffer = await fs.promises.readFile(filePath);
    
    // Determine content type from extension
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.webp': 'image/webp',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return { buffer, contentType };
  }
  
  // Check if using local storage (for API route decision)
  isUsingLocalStorage(): boolean {
    return this.shouldUseLocalStorage();
  }
}
