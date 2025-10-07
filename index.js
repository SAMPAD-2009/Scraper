

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
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);

    const allarticles = await page.evaluate(() => {
        const articles = document.querySelectorAll('.md-history-event, .featured-event-card');
        document.querySelector('.card-body>.title').remove();

        return Array.from(articles).map(article => {

            const img = article.querySelector('.card-media>img').src;
            const date = article.querySelector('.card-media>.date-label').textContent.replace(/\s+/g, ' ').trim();
            const desc = article.querySelector('.card-body,.description').textContent.replace(/\s+/g, ' ').trim();

            return { event_year: date, event_description: desc, event_picture: img };
        });


    })
    await browser.close();
    

    // console.log(allarticles);

    const tablename = 'historical_events';

    async function deleteRowWithServiceRole(tableName, rowId) {

        const { error } = await supabase
            .from(tableName)
            .delete()
            .gt('id', rowId)

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
            .insert(data)



        if (error) {
            console.error('Error inserting data:', error);
            return { success: false, error };
        }

        console.log('Successfully inserted data:', insertedData);
        return { success: true, data: insertedData };

    }



    if (deleteRowWithServiceRole(tablename, 0)) {
        insertArrayOfObjects(tablename, allarticles);
    }









}
run();




