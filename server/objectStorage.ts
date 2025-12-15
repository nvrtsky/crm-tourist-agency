import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import type { Request } from "express";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
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

export class ObjectStorageService {
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
    const privateDir = this.getPrivateObjectDir();
    // Sanitize filename: keep original name but add timestamp prefix to avoid collisions
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    const objectPath = `${privateDir}/${folder}/${filename}`;

    const { bucketName, objectName } = this.parseObjectPath(objectPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const blob = bucket.file(objectName);

    await blob.save(file.buffer, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
      },
    });

    // Return the path relative to private directory
    return `/${folder}/${filename}`;
  }

  async deleteFile(relativePath: string): Promise<void> {
    const privateDir = this.getPrivateObjectDir();
    const fullPath = `${privateDir}${relativePath}`;

    const { bucketName, objectName } = this.parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
  }

  async getFileBuffer(relativePath: string): Promise<{ buffer: Buffer; contentType: string }> {
    const privateDir = this.getPrivateObjectDir();
    const fullPath = `${privateDir}${relativePath}`;

    const { bucketName, objectName } = this.parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || 'application/octet-stream';

    return { buffer, contentType };
  }
}
