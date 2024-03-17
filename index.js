import MUSCLES from './data/muscles.json' assert { type: 'json' };
import axios from 'axios';
import { parse, valid } from 'node-html-parser';
import fs from 'fs';

async function wait(delay) {
    console.log(`Waiting ${delay}ms`)
    return new Promise((resolve) => setTimeout(resolve, delay))
}

// Get the data from the website and returns a plain html
async function getData(muscleSlug, page = 1) {
    try {
        const { data } = await axios.get(`https://www.muscleandstrength.com/exercises/${muscleSlug}`, {
            params: {
                ajax: 1, // To return the html portion that we need
                did: 4, // Order from A-Z
                page: page === 1 ? undefined : page
            }
        })
    
        return data?.view;
    } catch (e) {
        console.error("Error getting data", e.message);
    }
}

// The html cames with weird characters, so we clean it
function cleanHtml(rawHtml) {
    return rawHtml?.replaceAll('\n', '')?.replaceAll('\t', '')?.replaceAll('\"', '"');
}

async function fetchAndCleanHtml(muscleSlug, page) {
    const rawHtml = await getData(muscleSlug, page);
    return cleanHtml(rawHtml);
}

function getListContainerElementFromHtml(html) {
    if (!valid(html)) {
        console.error('Invalid html data');
        return null;
    }
    const root = parse(html);
    return root.querySelector('.grid-x.grid-margin-x.grid-margin-y');
}

function getExercisesFromListContainerElement(listContainerElement, muscleSlug) {
    const exercises = [];
    
    listContainerElement.querySelectorAll('.cell.small-12')?.forEach(exercise => {
        const externalExercisePage = 'https://www.muscleandstrength.com' + exercise.querySelector('.node-image a')?.getAttribute('href');
        const coverImage = exercise.querySelector('.node-image img')?.getAttribute('data-src') ?? exercise.querySelector('.node-image img')?.getAttribute('src');
        const exerciseName = exercise.querySelector('.node-title a')?.innerText;
        const slug = exercise.querySelector('.node-title a')?.getAttribute('href')?.split('/').pop()?.replace('.html', '');

        const metadata = exercise.querySelectorAll('.grid-x.exercise-meta .cell .meta-box');
        const metadataObject = {};
        metadata.forEach(meta => {
            const key = meta.querySelector('label')?.innerText?.toLocaleLowerCase()?.trim();
            const value = meta.childNodes[2]?.innerText?.toLocaleLowerCase()?.trim();

            if (key === 'mechanics' || key === 'equipment') {
                metadataObject[key] = value;
            }
        });
        
        exercises.push({
            slug,
            name: exerciseName.trim(),
            image: coverImage,
            externalLink: externalExercisePage,
            mechanic: metadataObject.mechanics,
            equipment: slugify(metadataObject.equipment),
            muscle: muscleSlug
        });
    })

    return exercises;
}

function slugify(text) {
    return text?.replaceAll(' ', '-').toLowerCase()
}

function getEquipmentsFromExercises(exercises) {
    const equipments = [];

    function equipmentIsInArray(equipmentName) {
        return equipments.find(e => e.slug === slugify(equipmentName));
    }

    exercises.forEach(exercise => {
        if (exercise.equipment && !equipmentIsInArray(exercise.equipment)) {
            const name = exercise.equipment.charAt(0).toUpperCase() + exercise.equipment.slice(1);
            equipments.push({
                id: equipments.length + 1,
                slug: slugify(exercise.equipment),
                name: name.replaceAll('-', ' ')
            });
        }
    });

    return equipments;
}

function saveDataToFile(data, filename) {
    fs.writeFileSync(`./data/${filename}`, JSON.stringify(data, null, 4));
}

async function main() {
    console.log(`STARTING...`)
    let exercises = [];

    for (const muscle of MUSCLES) {
        console.log(`----- Fetching exercises for ${muscle.slug} -----`)
        let page = 1;

        while (true) {
            await wait(5000);

            const rawHtml = await fetchAndCleanHtml(muscle.slug, page);
            if (!rawHtml) {
                console.log(`No html data for ${muscle.slug}...`)
                break;
            }

            const listContainerElement = getListContainerElementFromHtml(rawHtml);
            if (!listContainerElement) {
                console.log(`No list container for ${muscle.slug}...`)
                break;
            }

            const exercisesList = getExercisesFromListContainerElement(listContainerElement, muscle.slug);
            exercises = exercises.concat(exercisesList);

            console.log(`Fetched ${muscle.slug} from page ${page}...`)

            page++;
        }
    }

    const equipments = getEquipmentsFromExercises(exercises);

    console.log(`Saving data to files...`)

    saveDataToFile(exercises, 'exercises.json');
    saveDataToFile(equipments, 'equipments.json');

    console.log(`FINISHED!`)
}

main()