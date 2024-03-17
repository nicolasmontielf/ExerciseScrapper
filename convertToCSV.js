import MUSCLES from './data/muscles.json' assert { type: 'json' };
import EQUIPMENTS from './data/equipments.json' assert { type: 'json' };
import GROUPS from './data/groups.json' assert { type: 'json' };
import EXERCISES from './data/exercises.json' assert { type: 'json' };
import { writeFile } from 'fs'

function mapMuscles(muscle) {
    const name = muscle.slug.charAt(0).toUpperCase() + muscle.slug.slice(1)?.replace('-', ' ')

    return {
        id: muscle.id,
        slug: muscle.slug,
        name: name,
        group_id: GROUPS.find(group => group.slug === muscle.group)?.id,
    }
}

function mapGroups(group) {
    return {
        id: group.id,
        name: group.name,
        slug: group.slug,
    }
}

function mapEquipments(equipment) {
    return {
        id: equipment.id,
        name: equipment.name,
        slug: equipment.slug,
    }
}

function mapExercises(exercise) {
    return {
        slug: exercise.slug,
        name: exercise.name,
        image: exercise.image,
        external_link: exercise.externalLink,
        mechanic: exercise.mechanic,
        muscle_id: MUSCLES.find(m => m.slug === exercise.muscle)?.id,
        equipment_id: EQUIPMENTS.find(e => e.slug === exercise.equipment)?.id ?? EQUIPMENTS.find(e => e.slug === 'no-equipment')?.id
    }
}

async function writeToCsv(data, filename) {
    const header = Object.keys(data[0]).join(',') + '\n'
    const body = data.map(row => Object.values(row).join(',')).join('\n')
    const csv = header + body
    
    writeFile(`./csv/${filename}`, csv, (err) => {
        if (err) {
            console.error('Error writing to file', err)
        }
    })
}

async function main() {
    const muscles = MUSCLES.map(mapMuscles)
    const groups = GROUPS.map(mapGroups)
    const equipments = EQUIPMENTS.map(mapEquipments)
    const exercises = EXERCISES.map(mapExercises)

    Promise.all([
        writeToCsv(muscles, 'muscles.csv'),
        writeToCsv(groups, 'groups.csv'),
        writeToCsv(equipments, 'equipments.csv'),
        writeToCsv(exercises, 'exercises.csv'),
    ])
}

main()