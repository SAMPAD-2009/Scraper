import puppeteer from "puppeteer";
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export const dynamic = "force-dynamic";

const today = new Date();
const monthName = today.toLocaleString('default', { month: 'long' });
const day = String(today.getDate()).padStart(2, '0');
const formattedDate = `${monthName}-${day}`;
const url = `https://www.britannica.com/on-this-day/${formattedDate}`;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);


async function run() {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"], // Compatible with GitHub Actions
        });
        const page = await browser.newPage();
        await page.goto(url);

        const allarticles = await page.evaluate(() => {
            const articles = document.querySelectorAll('.md-history-event, .featured-event-card');
            const titleElement = document.querySelector('.card-body>.title');
            if (titleElement) titleElement.remove();

            return Array.from(articles).map(article => {
                const imgElement = article.querySelector('.card-media>img');
                const img = imgElement ? imgElement.src : '';

                const dateElement = article.querySelector('.card-media>.date-label');
                const date = dateElement ? dateElement.textContent.replace(/\s+/g, ' ').trim() : '';

                const descElement = article.querySelector('.card-body,.description');
                const desc = descElement ? descElement.textContent.replace(/\s+/g, ' ').trim() : '';

                return { event_year: date, event_description: desc, event_picture: img };
            });
        });

        await browser.close();

        const tablename = 'historical_events';

        async function deleteRowWithServiceRole(tableName, rowId) {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .gt('id', rowId);

            if (error) {
                console.error('Service Role Delete FAILED:', error);
                return { success: false, error };
            }

            console.log('Service Role Delete Succeeded.');
            return { success: true };
        }

        async function insertArrayOfObjects(tableName, data) {
            const { data: insertedData, error } = await supabase
                .from(tableName)
                .insert(data);

            if (error) {
                console.error('Error inserting data:', error);
                return { success: false, error };
            }

            console.log('Successfully inserted data:', insertedData);
            return { success: true, data: insertedData };
        }

        const deleteResult = await deleteRowWithServiceRole(tablename, 0);
        if (deleteResult.success) {
            await insertArrayOfObjects(tablename, allarticles);
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

run();






