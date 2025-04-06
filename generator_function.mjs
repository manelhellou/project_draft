import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));

function getRandomNameByDate(date, sex) {
    try {
        const year = date.getFullYear();

        const fileName = `yob${year}${sex}`;
        const filePath = path.join(dir,"/data/names/", fileName);

        if (!fs.existsSync(filePath)) {
            throw new Error(`No name data found for year ${year}` + filePath);
        }


        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Split into array of names (assuming one name per line)
        const names = fileContent.split('\n').filter(name => name.trim() !== '');

        if (names.length === 0) {
            throw new Error(`No names found in the file for year ${year}`);
        }

        // Select a random name from the array
        const randomIndex = Math.floor(Math.random() * names.length);
        return names[randomIndex];
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return null;
    }
}

function getRandomSurname(){
    try{
        const filePath = path.join(dir,"/data/surname.txt");
        const fileContent = fs.readFileSync(filePath, 'utf8');

        const surnames = fileContent.split('\n');

        return surnames[Math.floor(Math.random() * 1000)].slice(0,-2);
    }
    catch (error){
        console.error(`Error: ${error.message}`);
        return null;
    }
}

function getSSN(name, surname) {
        const hash = crypto.createHash('sha256').update(""+name + surname + Math.floor(Math.random() * 100)).digest('hex');
        const digitsOnly = hash.replace(/\D/g, ''); // Remove non-digits
        return digitsOnly.slice(0, 12); // Optional: trim to a certain length
}
function getRandomDate() {
    const startDate = new Date(1925, 0, 1); // Jan 1, 1925
    const endDate = new Date(2023, 12, 1);   // Jan 1, 2025
    return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
}
export function getInjury(){
    try {
        const filePath = path.join(dir, "/data/car_accident_injuries.txt");
        const fileContent = fs.readFileSync(filePath, 'utf8');

        const injuryfile = fileContent.split('\n');
        let injuries = ""
        for (let i = 0; i < 1+Math.floor(Math.random() * 4); i++) {
            injuries += injuryfile[Math.floor(Math.random() * 137)] + ", "
        }

        return injuries
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return null;
    }
}

export function getVictim(){
    const dob = getRandomDate();
     const sex = Math.random() < 0.5 ? "F":"M";
     const name = getRandomNameByDate(dob, sex)
     const surname= getRandomSurname()
    return [
        name,
        surname,
        dob,
        sex,
        (Math.random() < 0.5),
        (name+"."+surname+(Math.floor(Math.random()*100))+"@gmail.com"),
        getSSN()

    ]
}

function selectRandomCounties(county) {
    try {
        // const fileContent = fs.readFileSync(dir, "/data/counties.txt");
        //
        // const allCounties = fileContent.split('\n').filter(county => county.trim() !== '');
        //
        const numberOfCountiesToSelect = Math.floor(Math.random() * 5) + 1;

        const selectedCounties = [county];

        for (let i = 0; i < numberOfCountiesToSelect; i++) {

            // const randomIndex = Math.floor(Math.random() * allCounties.length);
            // selectedCounties.push(allCounties[randomIndex]);
            selectedCounties.push( Math.floor(Math.random() *200))
            //allCounties.splice(randomIndex, 1);
        }

        return selectedCounties;
    } catch (error) {
        console.error('Error reading counties file:', error.message);
        return [];
    }
}

export function getRespondent(county){
    const dob = getRandomDate();
    const sex = Math.random() < 0.5 ? "F":"M";
    const name = getRandomNameByDate(dob, sex)
    const surname= getRandomSurname()
    let type = "";
    switch (Math.floor(Math.random()*5)){
        case 0:
        case 1:
            type="police";
            break;
        case 2:
            type="fireman";
            break;
        case 3:
        case 4:
            type="paramedic";
            break;
    }
    const counties = selectRandomCounties(county);


    return [
        name,
        surname,
        dob,
        sex,
        (name+"."+surname+(Math.floor(Math.random()*100))+"@gmail.com"),
        getSSN(),
        type,
        counties

    ]
}


