// Propery Stringify of EVS and IVS

let baseStats = {
    hp: document.getElementById('baseHp').textContent,
    attack: document.getElementById('baseAttack').textContent,
    defense: document.getElementById('baseDefense').textContent,
    "special attack": document.getElementById('baseSpecialAttack').textContent,
    "special defense": document.getElementById('baseDefense').textContent,
    speed: document.getElementById('baseSpeed').textContent,
}

const pokemonDetailsDiv = document.getElementById("pokemon-details");
const evInputs = document.querySelectorAll('[name$="EV"]:not(#totalEV)');


evInputs.forEach(input => {
    input.addEventListener('input', updateTotalEV);
})


main();


function main() {
    document.addEventListener("DOMContentLoaded", function () {
        const calculateStatsButton = document.getElementById("calculateStats");
        calculateStatsButton.addEventListener("click", parseStatForm);
    });
}

function validateIV(pokemonIV) {
    if (pokemonIV < 0 || pokemonIV > 31 || !Number.isInteger(pokemonIV))
        throw new Error("IV must be an integer value between 0 and 31.");
    else return pokemonIV;
}

function validateEV(pokemonEV) {
    if (pokemonEV < 0 || pokemonEV > 255 || !Number.isInteger(pokemonEV))
        throw new Error("EV must be an integer value between 0 and 255.");
    else return (pokemonEV)
}

function calculateHP(iv, ev) {
    let pokemonIV = validateIV(iv);
    let pokemonEV = validateEV(ev);

    // let pokemonLevel = 1;
    const pokemonHPArray = [];

    for (let pokemonLevel = 1; pokemonLevel <= 100; pokemonLevel++) {
        let calculatedHP = Math.floor(((2 * baseStats.hp + pokemonIV + (Math.floor(pokemonEV / 4))) * pokemonLevel) / 100) + pokemonLevel + 10;
        pokemonHPArray.push({ level: pokemonLevel, hp: calculatedHP });
    }
    return pokemonHPArray;
}

function calculateStat(stat, iv, ev) {
    if (stat.toLowerCase().includes("hp")) return calculateHP(iv, ev);
    const validStats = ['attack', 'defense', 'speed', 'special attack', 'special defense']
    stat = stat.toLowerCase();
    if (!validStats.includes(stat)) throw new Error(`Invalid stat specified: '${stat}'`);

    let pokemonEV = validateEV(ev);
    let pokemonIV = validateIV(iv);

    const pokemonStatArray = {}
    pokemonStatArray["statType"] = stat;
    pokemonStatArray["nature"] = {};

    const natureModifier = {
        Neutral: 1.0,
        Beneficial: 1.1,
        Hindered: 0.9,
    }

    for (const nature in natureModifier) {
        pokemonStatArray['nature'][nature] = []

        let pokemonLevel = 1;
        for (; pokemonLevel <= 100; pokemonLevel++) {

            let calculatedStat = Math.floor(
                (Math.floor(((2 * baseStats[stat] + pokemonIV + Math.floor(pokemonEV / 4)) * pokemonLevel) / 100) + 5) * natureModifier[nature]
            );
            pokemonStatArray['nature'][nature].push({ level: pokemonLevel, stat: calculatedStat });
        }
    }
    return pokemonStatArray;
}

function parseStatForm() {
    const form = document.getElementById('statForm');
    if (!form) return;

    // Clear anything in the div
    while (pokemonDetailsDiv.hasChildNodes()) {
        pokemonDetailsDiv.removeChild(pokemonDetailsDiv.firstChild);
    }

    // Get Base Data
    baseStats = {
        hp: document.getElementById('baseHp').textContent,
        attack: document.getElementById('baseAttack').textContent,
        defense: document.getElementById('baseDefense').textContent,
        "special attack": document.getElementById('baseSpecialAttack').textContent,
        "special defense": document.getElementById('baseDefense').textContent,
        speed: document.getElementById('baseSpeed').textContent,
    }

    // Parse the data
    const ivs = {
        hp: form.hpIV.value === '' ? 0 : parseInt(form.hpIV.value),
        attack: form.attackIV.value === '' ? 0 : parseInt(form.attackIV.value),
        defense: form.defenseIV.value === '' ? 0 : parseInt(form.defenseIV.value),
        "special attack": form.spAttackIV.value === '' ? 0 : parseInt(form.spAttackIV.value),
        "special defense": form.spDefenseIV.value === '' ? 0 : parseInt(form.spDefenseIV.value),
        speed: form.speedIV.value === '' ? 0 : parseInt(form.speedIV.value),
    };

    const evs = {
        hp: form.hpEV.value === '' ? 0 : parseInt(form.hpEV.value),
        attack: form.attackEV.value === '' ? 0 : parseInt(form.attackEV.value),
        defense: form.defenseEV.value === '' ? 0 : parseInt(form.defenseEV.value),
        "special attack": form.spAttackEV.value === '' ? 0 : parseInt(form.spAttackEV.value),
        "special defense": form.spDefenseEV.value === '' ? 0 : parseInt(form.spDefenseEV.value),
        speed: form.speedEV.value === '' ? 0 : parseInt(form.speedEV.value),
    }
    // Must not exceed 510
    const totalEVs = Object.values(evs).reduce((a, b) => a + b, 0);
    if (totalEVs > 510) {
        console.error(`EVs exceed sum of 510 - ${totalEVs} given`);
        if (document.getElementById('errorExceedEVSum')) document.getElementById('errorExceedEVSum').remove();
        const errorDiv = document.createElement("div");
        errorDiv.classList = "error-message";
        errorDiv.id = "errorExceedEVSum"
        errorDiv.textContent = "Total EV must not exceed 510. Current value is " + totalEVs;
        statForm.appendChild(errorDiv);
        return;
    }
    const pokemonHP = calculateHP(ivs.hp, evs.hp);
    const pokemonAttack = calculateStat("Attack", ivs.attack, evs.attack);
    const pokemonDefense = calculateStat("Defense", ivs.defense, evs.defense);
    const pokemonSpeed = calculateStat("Speed", ivs.speed, evs.speed);
    const pokemonSpAttack = calculateStat("Special Attack", ivs["special attack"], evs["special attack"]);
    const pokemonSpDefense = calculateStat("Special Defense", ivs["special defense"], evs["special defense"]);

    generateNatureTables(pokemonHP, pokemonAttack, pokemonDefense, pokemonSpeed, pokemonSpAttack, pokemonSpDefense, ivs, evs);
}

function generateNatureTables(pokemonHP, pokemonAttack, pokemonDefense, pokemonSpeed, pokemonSpAttack, pokemonSpDefense, ivs, evs) {
    if (!pokemonDetailsDiv) return;

    const iv = JSON.stringify(ivs);
    const ev = JSON.stringify(evs)

    const evIvText = document.createElement("p");
    evIvText.textContent = `IV: ${iv}, EV: ${ev}`;
    pokemonDetailsDiv.appendChild(evIvText);

    const natureOrder = ["Neutral", "Beneficial", "Hindered"];
    const statNames = ["Attack", "Defense", "Speed", "Special Attack", "Special Defense"];

    natureOrder.forEach(nature => {
        const table = document.createElement("table");
        table.classList.add("pokemon-table")
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");

        const headerRow = document.createElement("tr");
        const headers = ["Level", "HP"];

        statNames.forEach(statName => {
            headers.push(statName);
        });

        headers.forEach(headerText => {
            const th = document.createElement("th");
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const natureTitle = document.createElement("h3");
        natureTitle.textContent = `Nature: ${nature} to Stat`;
        pokemonDetailsDiv.appendChild(natureTitle);

        for (let level = 1; level <= 100; level++) {
            const row = document.createElement("tr");
            const levelCell = document.createElement("td");
            levelCell.textContent = level;
            row.appendChild(levelCell);

            const hpCell = document.createElement("td");
            hpCell.textContent = getHPAtLevel(pokemonHP, level);
            row.appendChild(hpCell);

            const stats = [pokemonAttack, pokemonDefense, pokemonSpeed, pokemonSpAttack, pokemonSpDefense];
            stats.forEach(stat => {
                const cell = document.createElement("td");
                cell.textContent = getStatAtLevel(stat, level, nature);
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        pokemonDetailsDiv.appendChild(table);
    });
}

function getHPAtLevel(hpData, level) {
    const levelData = hpData.find(item => item.level === level);
    if (levelData) {
        return levelData.hp;
    }
    return "N/A";
}

function getStatAtLevel(statData, level, nature) {
    if (!statData || !statData.nature || !statData.nature[nature]) {
        return "N/A";
    }
    const levelData = statData.nature[nature].find(item => item.level === level);
    if (levelData) {
        return levelData.stat;
    }
    return "N/A";
}


function updateTotalEV() {
    const form = document.getElementById("statForm");
    const formItem = document.querySelector('.form-items');

    const evs = {
        hp: form.hpEV.value === '' ? 0 : parseInt(form.hpEV.value),
        attack: form.attackEV.value === '' ? 0 : parseInt(form.attackEV.value),
        defense: form.defenseEV.value === '' ? 0 : parseInt(form.defenseEV.value),
        "special attack": form.spAttackEV.value === '' ? 0 : parseInt(form.spAttackEV.value),
        "special defense": form.spDefenseEV.value === '' ? 0 : parseInt(form.spDefenseEV.value),
        speed: form.speedEV.value === '' ? 0 : parseInt(form.speedEV.value),
    };

    const totalEVs = Object.values(evs).reduce((a, b) => a + b, 0);
    if (totalEVs > 510) {
        if (!document.getElementById("evError")) {
            const divEVError = document.createElement("div");
            divEVError.textContent = "EV total is invalid - it must not exceed 510."
            divEVError.classList = "alert error";
            divEVError.id = "evError";
            formItem.insertAdjacentElement("afterEnd", divEVError);
        }
    }
    else {
        if (document.getElementById("evError")) {
            document.getElementById("evError").remove();
        }
    }
    document.getElementById("totalEV").value = totalEVs;
}