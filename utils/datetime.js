import { sql } from 'drizzle-orm';

/**
 * Get current timestamp in Central Time (America/Chicago)
 * Uses PostgreSQL's NOW() function which respects the database timezone setting
 * 
 * Since the database is configured with timezone='America/Chicago',
 * NOW() will automatically return Central Time
 */
export function getNowCentral() {
    // Return a SQL expression that PostgreSQL will evaluate as NOW()
    // This ensures the database uses its configured timezone (America/Chicago)
    return sql`NOW()`;
}

/**
 * Alternative: Get SQL-formatted Central Time string
 * Use this if you need to pass raw SQL
 */
export function getCentralTimeSQL() {
    const now = new Date();
    const centralTimeString = now.toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
        hour12: false
    });

    const [datePart, timePart] = centralTimeString.split(', ');
    const [month, day, year] = datePart.split('/');

    return `${year}-${month}-${day} ${timePart}`;
}
