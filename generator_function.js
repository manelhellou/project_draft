
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getRandomNameByDate(date, sex) {
    try {
        const year = date.split('-')[0].trim();

        const fileName = `yob${year}${sex}`;
        const filePath = path.join(__dirname,"/data/names/", fileName);

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
        console.log(names[randomIndex]);
        return names[randomIndex];
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return null;
    }
}

function getRandomSurname(){
    try{
        const filePath = path.join(__dirname,"/data/surname.txt");
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
        const hash = crypto.createHash('sha256').update(name + surname + Math.floor(Math.random() * 100)).digest('hex');
        const digitsOnly = hash.replace(/\D/g, ''); // Remove non-digits
        return digitsOnly.slice(0, 12); // Optional: trim to a certain length
}




