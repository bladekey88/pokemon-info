// utils.js
import { LOADER } from './constants.js'


// This is a general utility JS file that is not tied to anything project specific

/**
 * Capitalises the first letter of each word in a string while preserving spaces and hyphens.
 *
 * @param {string} words - The input string.
 * @returns {string} The string with capitalised words retaining special characters.
 */
export function capitaliseWords(words) {
    if (typeof (words) !== 'string' || words.length == 0) return words;

    return words
        .split(/(\s+|-)/)
        .map((word, index, arr) => {
            if (index % 2 === 0 && word.length > 0) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
        })
        .join('')
        .trim();
}

/**
 * Normalises a string by removing diacritical marks (accents, etc.).
 *
 * This function uses Unicode normalisation form NFD (Normalisation Form Decomposition)
 * to separate base characters from combining diacritical marks. It then removes the
 * combining marks using a regular expression.
 *
 * @param {string} str - The input string to be normalised.
 * @returns {string} The normalised string with diacritical marks removed.
 *
*/
export function normaliseString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Removes all hyphens from a string and replaces them with an optional string.
 *
 * @param {string} str - The input string.
 * @param {string} [replaceWith=" "] - The string to replace hyphens with. Defaults to an a space.
 * @returns {string} - The string with all hyphens replaced.
 *
 */
export function replaceHyphens(str, replaceWith = " ") {
    return str.replaceAll("-", replaceWith);
}


/**
 * Creates and displays a loader element immediately before a specified element.
 * The loader's appearance is defined by CSS using the "loader" class.
 *
 * @param {string} [elementID=LOADER.ANCHOR_DIV] - The ID of the element *after* which the loader should be inserted.
 * Defaults to LOADER.ANCHOR_DIV if not provided.
 * Note: The loader is inserted *before* this element.
 */
export function showLoader(elementID = LOADER.ANCHOR_DIV) {
    const elementDiv = document.getElementById(elementID);
    if (!elementDiv) {
        console.error(`Element with ID '${elementID}' not found.`);
        return;
    }

    // Loader Div
    const loaderDiv = document.createElement("div");
    loaderDiv.classList = "loader";
    loaderDiv.id = LOADER.DIV_ID;
    // Loader Text
    const loaderTextParagraph = document.createElement("div");
    loaderTextParagraph.id = LOADER.TEXT_ID
    loaderTextParagraph.textContent = "Loading";
    // ARIA
    loaderDiv.setAttribute("aria-busy", "true");
    loaderDiv.setAttribute("role", "status"); // or "alert" if appropriate
    loaderDiv.setAttribute("aria-live", "polite");

    elementDiv.insertAdjacentElement("beforebegin", loaderTextParagraph);
    elementDiv.insertAdjacentElement("beforebegin", loaderDiv);
}

/**
 * Updates the text content of an HTML element with the specified ID.
 * Logs a warning if the element is not found.
 *
 * @param {string} text - The text to set.
 * @param {string} [loaderTextId=LOADER.TEXT_ID] - The ID of the element to update. Defaults to LOADER.TEXT_ID.
 */
export function updateLoaderText(text, loaderTextId = LOADER.TEXT_ID) {
    const element = document.getElementById(loaderTextId);
    if (!element) {
        console.warn(`Element with ID "${loaderTextId}" not found.`);
        return;
    }
    element.textContent = text;
}

/**
 * Removes the loader element with the specified ID.
 *
 * @param {string} [loaderDivId=LOADER.DIV_ID] - The ID of the loader element to remove.
 * @param {string} [loaderTextDivId=LOADER.TEXT_ID] - The ID of the loader text to remove.
 * Defaults to LOADER.DIV_ID if not provided.
 */
export function hideLoader(loaderDivId = LOADER.DIV_ID, loaderTextDivId = LOADER.TEXT_ID) {
    const loaderDiv = document.getElementById(loaderDivId);
    const loaderTextDiv = document.getElementById(loaderTextDivId);
    if (!loaderDiv) {
        console.error(`Element with ID '${loaderDivId}' not found.`);
        return;
    }
    if (!loaderTextDiv) {
        console.error(`Element with ID '${loaderTextDivId}' not found.`);
        return;
    }

    loaderDiv.setAttribute("aria-busy", "false");
    loaderDiv.remove();
    loaderTextDiv.remove();
}

/**
 * Highlights all occurrences of a search term within a given input string.
 *
 * @param {string} inputString - The string in which to search for and highlight the term.
 * @param {string} searchTerm - The term to search for and highlight.
 * @param {string} [highlightClass="highlight"] - The CSS class to apply to highlighted matches.
 * @returns {string} - The input string with the search term highlighted.
 */
export function highlightMatch(inputString, searchTerm, highlightClass = "highlight") {
    if (!searchTerm) return text;

    const regex = new RegExp(searchTerm, 'gi');
    return inputString.replace(regex, `<span class="${highlightClass}">$&</span>`);
}

/**
 * Debounces a function, delaying its execution until after a specified period of inactivity.
 *
 * @param {Function} func The function to debounce.
 * @param {number} delay The delay in milliseconds before the function is executed.
 * @returns {Function} A debounced version of the function.
 *
 * @example
  * const debouncedSearch = debounce(searchFunction, 250);
 *
 * searchInput.addEventListener('input', (event) => {
 * debouncedSearch(event.target.value);
 * });
 */
export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}


/**
 * Retrieves and parses data from localStorage.
 *
 * @param {string} key - The key used to store the data in localStorage.
 * @returns {any|null} - The parsed data if successful, or null if the key doesn't exist or parsing fails.
 */
export function checkLocalStorage(key) {
    const storedData = localStorage.getItem(key);

    if (storedData) {
        try {
            const data = JSON.parse(storedData);
            return data;
        } catch (error) {
            console.error(`Error parsing stored data for key "${key}":`, error);
            return null;
        }
    }
    // Key doesn't exist
    return null;
}

/**
 * Calculates the approximate size of data stored in localStorage.
 *
 * Iterates through all keys in localStorage, retrieves their values,
 * and calculates the total size in bytes, considering UTF-16 encoding.
 *  *
 * @returns {object} An object containing the size of localStorage data in bytes, kilobytes, and megabytes.
 * {
 * bytes: number, // Total size in bytes.
 * kb: number,    // Total size in kilobytes.
 * mb: number     // Total size in megabytes.
 * }
 */
export function getLocalStorageSize() {
    let totalSize = 0;

    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            let value = localStorage.getItem(key);

            // Calculate size: key length + value length (using UTF-16 characters)
            totalSize += (key.length + (value ? value.length : 0)) * 2;
        }
    }
    // Convert to KB or MB for easier reading (optional)
    const sizeInKB = totalSize / 1024;
    const sizeInMB = sizeInKB / 1024;

    return {
        bytes: totalSize,
        kb: sizeInKB,
        mb: sizeInMB
    };
}

/**
 * Checks if a given string represents a valid number.
 *
 * This function determines if a string can be parsed as a floating-point number.
 * It handles various edge cases, including non-string inputs, empty strings, and strings with spaces.
 *
 * @see https://stackoverflow.com/questions/175739/how-can-i-check-if-a-string-is-a-valid-number
 * 
 * @param {string} str - The string to check.
 * @returns {boolean} True if the string is numeric, false otherwise.
 */
export function isNumeric(str) {

    if (typeof str != "string") return false
    return !isNaN(str) && !isNaN(parseFloat(str))
}


/**
 * Displays an error message within a specified HTML element.
 *
 * This function creates or updates a div element with the ID 'error' to display
 * the given error message. The 'error' div is appended to the HTML element
 * specified by the `anchorDivId` parameter.
 *
 * @param {string} msg - The error message to display.
 * @param {string} [targetId='search-form'] - The ID of the HTML element where the error
 * message should be displayed. Defaults to 'search-form'.
 * @returns {void}
 *
 * @throws {Error} Will log an error to the console if the target element with the given ID is not found.
 */
export function displayError(msg, targetId = 'search-form') {
    const errDiv = document.getElementById('error');

    if (!errDiv) {
        const newErrDiv = document.createElement('div');
        newErrDiv.id = 'error';
        const target = document.getElementById(targetId);
        if (target) {
            target.appendChild(newErrDiv);
        } else {
            console.error(`Target element '${targetId}' not found.`);
            return;
        }
    }
    document.getElementById('error').textContent = msg;
}


/**
 * Converts a weight value from decagrams to kilograms.
 * PokeAPI and indeed pokemon store data in decagram
 *  1 decagram is 10 grams or 0.01 kilograms (1*10-2kg)
 *
 * @param {number} weight - The weight in decagrams.
 * @returns {number} The weight in kilograms.
 */
export function convertWeight(weight) {
    return weight / 10;
}

/**
 * Converts a height value from decimeters to meters.
 *  * PokeAPI and indeed pokemon store data in decimetres
 *  1 decimetre is 0.1 metres or 0.01kg (1*10-1m)
 *
 * @param {number} height - The height in decimeters.
 * @returns {number} The height in meters.
 */
export function convertHeight(height) {
    return height / 10;
}

/**
 * Extracts the generation number from a string in the format "generation-X", 
 * where X is a Roman numeral. This is how it is supplied in the PokéAPI
 *
 * @param { string } generationName - A string representing the generation name.
 * @returns { string } A string representing the generation number in the format "Generation X", 
 * where X is the uppercase Roman numeral.
 */
export function extractGenerationNumber(generationName) {
    if (!generationName.startsWith("generation-")) {
        throw new Error("Invalid generation name format.");
        return
    }
    const romanNumeral = generationName.replace("generation-", "").toUpperCase();
    return `Generation ${romanNumeral}`;
}