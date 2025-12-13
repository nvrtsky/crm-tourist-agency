/**
 * Website Scraper for chinaunique.ru tours
 * Parses tour list and individual tour pages to extract:
 * - Tour name, price, cities, tour type, dates
 * Creates events in CRM for each tour + date combination
 */

interface TourData {
  slug: string;
  url: string;
  name: string;
  price: number;
  currency: string;
  tourType: string;
  duration: number;
  cities: string[];
  dates: { startDate: string; endDate: string }[];
  description?: string;
}

interface TourAction {
  name: string;
  action: 'created' | 'updated' | 'archived';
  dates: number;
  startDate?: string;
  priceChange?: { from: number; to: number; currency: string };
}

interface SyncWarning {
  type: 'no_dates' | 'no_description' | 'no_cities' | 'parse_error';
  tourName: string;
  message: string;
}

interface SyncResult {
  created: number;
  updated: number;
  archived: number;
  errors: string[];
  tours: { name: string; dates: number }[];
  // Enhanced details
  tourActions: TourAction[];
  warnings: SyncWarning[];
  durationMs: number;
  toursScraped: number;
  totalDatesProcessed: number;
  source: string;
}

const SITE_BASE_URL = 'https://chinaunique.ru';
const TOURS_PAGE_URL = `${SITE_BASE_URL}/tours/`;

// Russian month names for date parsing
const MONTH_MAP: Record<string, number> = {
  'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
  'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
  'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
};

// Tour type mapping
const TOUR_TYPE_MAP: Record<string, string> = {
  'Групповые туры': 'group',
  'Индивидуальные туры': 'individual',
  'Экскурсии в Китае': 'excursion',
  'Экскурсии': 'excursion'
};

/**
 * Decode HTML entities in a string
 * Converts &#171; to « and &#187; to » etc.
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  
  // Common HTML entities
  const entities: Record<string, string> = {
    '&#171;': '«',
    '&#187;': '»',
    '&#34;': '"',
    '&#39;': "'",
    '&#38;': '&',
    '&#60;': '<',
    '&#62;': '>',
    '&laquo;': '«',
    '&raquo;': '»',
    '&quot;': '"',
    '&apos;': "'",
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
  };
  
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }
  
  // Handle decimal numeric entities like &#171;
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  
  // Handle hexadecimal numeric entities like &#xAB; or &#XAB;
  result = result.replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return result;
}

/**
 * Fetch HTML content from URL
 */
async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'CRM-Sync-Bot/1.0'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

/**
 * Extract tour URLs from the tours listing page (handles pagination)
 */
async function getTourUrls(): Promise<string[]> {
  const tourUrls: string[] = [];
  let pageNum = 1;
  let hasMore = true;

  while (hasMore) {
    const pageUrl = pageNum === 1 ? TOURS_PAGE_URL : `${TOURS_PAGE_URL}page/${pageNum}/`;
    
    try {
      const html = await fetchPage(pageUrl);
      
      // Extract tour block URLs
      const tourBlockRegex = /href="(https:\/\/chinaunique\.ru\/tours\/[^"]+\/)" class="tour-block"/g;
      let match;
      let foundOnPage = 0;
      
      while ((match = tourBlockRegex.exec(html)) !== null) {
        const url = match[1];
        if (!tourUrls.includes(url)) {
          tourUrls.push(url);
          foundOnPage++;
        }
      }
      
      // Check for next page
      hasMore = html.includes(`/tours/page/${pageNum + 1}/`);
      pageNum++;
      
      // Safety limit
      if (pageNum > 10) break;
      
    } catch (error) {
      console.error(`Error fetching page ${pageNum}:`, error);
      hasMore = false;
    }
  }
  
  return tourUrls;
}

/**
 * Parse Russian date range like "16-22 марта 2026 г" to start/end dates
 * Handles multiple formats:
 * - "16-22 марта 2026" (same month with hyphen)
 * - "5–12 мая 2026" (same month with en-dash, no spaces)
 * - "26 мая-1 июня 2026" (cross month)
 * - "16 марта – 22 марта 2026" (full dates with em-dash)
 * - "с 5 по 12 мая 2026" (Russian "from X to Y")
 * - "5 апреля 2026" (single day)
 */
function parseDateRange(dateStr: string): { startDate: string; endDate: string } | null {
  try {
    // Clean the string: normalize whitespace, remove "г", normalize all dash types to hyphen
    dateStr = dateStr.trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*г\.?$/i, '')
      .replace(/[–—―‒]/g, '-');  // en-dash, em-dash, horizontal bar, figure dash
    
    // Pattern: "с 5 по 12 мая 2026" (Russian "from X to Y" format)
    const russianFromToMatch = dateStr.match(/с\s*(\d+)\s*по\s*(\d+)\s+(\S+)\s+(\d{4})/i);
    if (russianFromToMatch) {
      const [, startDay, endDay, month, year] = russianFromToMatch;
      const monthNum = MONTH_MAP[month.toLowerCase()];
      
      if (monthNum !== undefined) {
        const startDate = new Date(parseInt(year), monthNum, parseInt(startDay));
        const endDate = new Date(parseInt(year), monthNum, parseInt(endDay));
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }
    }
    
    // Pattern: "16 марта - 22 марта 2026" (full date on both sides)
    const fullDatesMatch = dateStr.match(/(\d+)\s+(\S+)\s*-\s*(\d+)\s+(\S+)\s+(\d{4})/);
    if (fullDatesMatch) {
      const [, startDay, startMonth, endDay, endMonth, year] = fullDatesMatch;
      const startMonthNum = MONTH_MAP[startMonth.toLowerCase()];
      const endMonthNum = MONTH_MAP[endMonth.toLowerCase()];
      
      if (startMonthNum !== undefined && endMonthNum !== undefined) {
        const startDate = new Date(parseInt(year), startMonthNum, parseInt(startDay));
        const endDate = new Date(parseInt(year), endMonthNum, parseInt(endDay));
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }
    }
    
    // Pattern: "26 мая-1 июня 2026" (cross month, compact)
    const crossMonthMatch = dateStr.match(/(\d+)\s+(\S+)-(\d+)\s+(\S+)\s+(\d{4})/);
    if (crossMonthMatch) {
      const [, startDay, startMonth, endDay, endMonth, year] = crossMonthMatch;
      const startMonthNum = MONTH_MAP[startMonth.toLowerCase()];
      const endMonthNum = MONTH_MAP[endMonth.toLowerCase()];
      
      if (startMonthNum !== undefined && endMonthNum !== undefined) {
        const startDate = new Date(parseInt(year), startMonthNum, parseInt(startDay));
        const endDate = new Date(parseInt(year), endMonthNum, parseInt(endDay));
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }
    }
    
    // Pattern: "16-22 марта 2026" or "5-12 мая 2026" (same month, with or without spaces around dash)
    const sameMonthMatch = dateStr.match(/(\d+)\s*-\s*(\d+)\s+(\S+)\s+(\d{4})/);
    if (sameMonthMatch) {
      const [, startDay, endDay, month, year] = sameMonthMatch;
      const monthNum = MONTH_MAP[month.toLowerCase()];
      
      if (monthNum !== undefined) {
        const startDate = new Date(parseInt(year), monthNum, parseInt(startDay));
        const endDate = new Date(parseInt(year), monthNum, parseInt(endDay));
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
      }
    }
    
    // Pattern: "5 апреля 2026" (single day - start and end are the same)
    const singleDayMatch = dateStr.match(/^(\d+)\s+(\S+)\s+(\d{4})$/);
    if (singleDayMatch) {
      const [, day, month, year] = singleDayMatch;
      const monthNum = MONTH_MAP[month.toLowerCase()];
      
      if (monthNum !== undefined) {
        const date = new Date(parseInt(year), monthNum, parseInt(day));
        const dateStr = date.toISOString().split('T')[0];
        return {
          startDate: dateStr,
          endDate: dateStr
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Date parse error:', dateStr, error);
    return null;
  }
}

/**
 * Extract cities from tour content (from "📍 Проживание:" markers)
 */
function extractCities(html: string): string[] {
  const cities: string[] = [];
  
  // Match "Проживание:" followed by city name
  const cityRegex = /Проживание:<\/strong>[\s:]*([^<\n]+)/gi;
  let match;
  
  while ((match = cityRegex.exec(html)) !== null) {
    const city = match[1].trim().replace(/[^\w\sА-Яа-яЁё-]/g, '').trim();
    if (city && city !== 'нет' && !cities.includes(city)) {
      cities.push(city);
    }
  }
  
  // Also try alternate pattern
  const altRegex = /Проживание:[\s]*<\/span>[\s]*([^<\n]+)/gi;
  while ((match = altRegex.exec(html)) !== null) {
    const city = match[1].trim().replace(/[^\w\sА-Яа-яЁё-]/g, '').trim();
    if (city && city !== 'нет' && !cities.includes(city)) {
      cities.push(city);
    }
  }
  
  return cities;
}

/**
 * Parse individual tour page to extract all data
 */
async function parseTourPage(url: string): Promise<TourData | null> {
  try {
    const html = await fetchPage(url);
    const slug = url.match(/\/tours\/([^/]+)\/?$/)?.[1] || '';
    
    // Extract title and decode HTML entities
    const titleMatch = html.match(/<h1[^>]*class="h1-alt"[^>]*>([^<]+)<\/h1>/);
    const name = decodeHtmlEntities(titleMatch?.[1]?.trim() || '');
    
    if (!name) {
      console.error('No title found for:', url);
      return null;
    }
    
    // Extract price
    const priceMatch = html.match(/data-base-price="(\d+)"/);
    const price = priceMatch ? parseInt(priceMatch[1]) : 0;
    
    // Extract tour type
    let tourType = 'group';
    const tourTypeMatch = html.match(/<div class="tour-tag">([^<]+)<\/div>/);
    if (tourTypeMatch) {
      const typeStr = tourTypeMatch[1].trim();
      tourType = TOUR_TYPE_MAP[typeStr] || 'group';
    }
    
    // Extract duration from title (e.g., "7 дней", "2 дня")
    const durationMatch = name.match(/(\d+)\s*(дней|дня|день)/i);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 7;
    
    // Extract cities
    const cities = extractCities(html);
    if (cities.length === 0) {
      // Try to extract from meta description
      const metaMatch = html.match(/meta name="description" content="([^"]+)"/);
      if (metaMatch) {
        const desc = metaMatch[1];
        // Common cities in China
        const knownCities = ['Пекин', 'Шанхай', 'Чжанцзяцзе', 'Сиань', 'Лоян', 'Гуанчжоу', 'Гуйлинь', 'Яншо', 'Куньмин', 'Лицзян', 'Шангрила'];
        for (const city of knownCities) {
          if (desc.includes(city) && !cities.includes(city)) {
            cities.push(city);
          }
        }
      }
    }
    
    // Extract dates from "Даты ближайших туров" section
    const dates: { startDate: string; endDate: string }[] = [];
    const datesSection = html.match(/Даты ближайших туров<\/div>[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
    
    if (datesSection) {
      const dateListHtml = datesSection[1];
      const dateRegex = /<li>([^<]+)<\/li>/g;
      let dateMatch;
      
      while ((dateMatch = dateRegex.exec(dateListHtml)) !== null) {
        const parsed = parseDateRange(dateMatch[1]);
        if (parsed) {
          dates.push(parsed);
        }
      }
    }
    
    // Extract description and decode HTML entities
    const descMatch = html.match(/<div class="paragraph-prop"><p>([^<]+)<\/p>/);
    const description = decodeHtmlEntities(descMatch?.[1]?.trim() || '') || undefined;
    
    return {
      slug,
      url,
      name,
      price,
      currency: 'CNY',
      tourType,
      duration,
      cities: cities.length > 0 ? cities : ['Китай'],
      dates,
      description
    };
    
  } catch (error) {
    console.error('Error parsing tour page:', url, error);
    return null;
  }
}

/**
 * Generate unique external ID for tour + date combination
 */
function generateExternalId(slug: string, startDate: string): string {
  return `wp_${slug}_${startDate}`;
}

/**
 * Main scrape function - fetches all tours and their dates
 */
export async function scrapeAllTours(): Promise<TourData[]> {
  console.log('[SCRAPER] Starting to scrape tours from chinaunique.ru...');
  
  const tourUrls = await getTourUrls();
  console.log(`[SCRAPER] Found ${tourUrls.length} tour URLs`);
  
  const tours: TourData[] = [];
  
  for (const url of tourUrls) {
    const tourData = await parseTourPage(url);
    if (tourData) {
      tours.push(tourData);
      console.log(`[SCRAPER] Parsed: ${tourData.name} (${tourData.dates.length} dates)`);
    }
    // Small delay to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`[SCRAPER] Completed. Total tours: ${tours.length}`);
  return tours;
}

/**
 * Sync scraped tours to CRM database
 */
export async function syncToursToDatabase(
  tours: TourData[],
  storage: any
): Promise<SyncResult> {
  const startTime = Date.now();
  
  const result: SyncResult = {
    created: 0,
    updated: 0,
    archived: 0,
    errors: [],
    tours: [],
    tourActions: [],
    warnings: [],
    durationMs: 0,
    toursScraped: tours.length,
    totalDatesProcessed: 0,
    source: 'chinaunique.ru'
  };
  
  // Collect warnings for tours
  for (const tour of tours) {
    if (tour.dates.length === 0) {
      result.warnings.push({
        type: 'no_dates',
        tourName: tour.name,
        message: 'Тур без дат'
      });
    }
    if (!tour.description) {
      result.warnings.push({
        type: 'no_description',
        tourName: tour.name,
        message: 'Нет описания'
      });
    }
    if (tour.cities.length === 0 || (tour.cities.length === 1 && tour.cities[0] === 'Китай')) {
      result.warnings.push({
        type: 'no_cities',
        tourName: tour.name,
        message: 'Города не определены'
      });
    }
  }
  
  // Get all existing events with external IDs starting with 'wp_'
  const existingEvents = await storage.getAllEvents();
  const wpEvents = existingEvents.filter((e: any) => e.externalId?.startsWith('wp_'));
  const existingExternalIds = new Set(wpEvents.map((e: any) => e.externalId));
  const processedExternalIds = new Set<string>();
  
  // Track externalIds we've already created in this run to avoid duplicates
  const createdInThisRun = new Set<string>();
  
  for (const tour of tours) {
    let tourDatesCreated = 0;
    let tourDatesUpdated = 0;
    let priceChange: { from: number; to: number; currency: string } | undefined;
    
    for (const dateRange of tour.dates) {
      const externalId = generateExternalId(tour.slug, dateRange.startDate);
      
      // Skip if we already processed this externalId in this run
      if (processedExternalIds.has(externalId) || createdInThisRun.has(externalId)) {
        continue;
      }
      
      processedExternalIds.add(externalId);
      result.totalDatesProcessed++;
      
      const eventData = {
        name: tour.name,
        country: 'Китай',
        cities: tour.cities,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        price: tour.price,
        priceCurrency: tour.currency,
        tourType: tour.tourType,
        participantLimit: 20,
        description: tour.description || null,
        externalId,
        websiteUrl: tour.url,
        isArchived: false
      };
      
      try {
        // Check if event already exists in database
        const existingEvent = wpEvents.find((e: any) => e.externalId === externalId);
        
        if (existingEvent) {
          // Track price changes
          if (existingEvent.price !== tour.price) {
            priceChange = {
              from: existingEvent.price,
              to: tour.price,
              currency: tour.currency
            };
          }
          // Update existing event
          await storage.updateEvent(existingEvent.id, eventData);
          result.updated++;
          tourDatesUpdated++;
        } else {
          // Create new event (mark as created to avoid duplicate inserts)
          await storage.createEvent(eventData);
          createdInThisRun.add(externalId);
          result.created++;
          tourDatesCreated++;
        }
      } catch (error: any) {
        result.errors.push(`${tour.name} (${dateRange.startDate}): ${error.message}`);
      }
    }
    
    result.tours.push({ name: tour.name, dates: tour.dates.length });
    
    // Record tour action
    if (tourDatesCreated > 0) {
      result.tourActions.push({
        name: tour.name,
        action: 'created',
        dates: tourDatesCreated,
        startDate: tour.dates[0]?.startDate,
        priceChange
      });
    } else if (tourDatesUpdated > 0) {
      result.tourActions.push({
        name: tour.name,
        action: 'updated',
        dates: tourDatesUpdated,
        startDate: tour.dates[0]?.startDate,
        priceChange
      });
    }
  }
  
  // Archive events that no longer exist on the website
  for (const event of wpEvents) {
    if (!processedExternalIds.has(event.externalId) && !event.isArchived) {
      try {
        await storage.archiveEvent(event.id);
        result.archived++;
        result.tourActions.push({
          name: event.name,
          action: 'archived',
          dates: 1,
          startDate: event.startDate
        });
      } catch (error: any) {
        result.errors.push(`Archive ${event.name}: ${error.message}`);
      }
    }
  }
  
  result.durationMs = Date.now() - startTime;
  
  return result;
}

export { generateExternalId, parseDateRange, TourData, SyncResult, TourAction, SyncWarning };
