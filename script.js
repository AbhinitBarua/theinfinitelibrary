const InfiniteLibrary = (function() {
    "use strict";

    // --- CONFIGURATION ---
    const NUM_CHAPTERS = 5; // Number of chapters per book
    const PARAGRAPHS_PER_CHAPTER_MIN = 5;
    const PARAGRAPHS_PER_CHAPTER_MAX = 10;
    const SENTENCES_PER_PARAGRAPH_MIN = 3;
    const SENTENCES_PER_PARAGRAPH_MAX = 7;

    // --- PRNG (Pseudo-Random Number Generator) ---
    const PRNG = {
        seed: 0,
        // LCG parameters from Numerical Recipes
        m: 2**32,
        a: 1664525,
        c: 1013904223,

        init: function(seedString) {
            let hash = 0;
            for (let i = 0; i < seedString.length; i++) {
                const char = seedString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0; // Convert to 32bit integer
            }
            this.seed = hash;
        },
        random: function() { // 0 to 1 (exclusive of 1)
            // Original problematic line:
            // this.seed = (this.a * this.seed + this.c) % this.m;
            // return this.seed / this.m;

            // Corrected calculation to ensure seed is always in [0, m-1]
            let val = (this.a * this.seed + this.c);
            this.seed = ((val % this.m) + this.m) % this.m; // Ensures positive modulo result
            return this.seed / this.m;
        },
        pick: function(arr) {
            return arr[Math.floor(this.random() * arr.length)];
        },
        range: function(min, max) { // min inclusive, max exclusive
            return Math.floor(this.random() * (max - min)) + min;
        },
        shuffle: function(array) {
            const arr = [...array];
            let m = arr.length, t, i;
            while (m) {
                i = Math.floor(this.random() * m--);
                t = arr[m];
                arr[m] = arr[i];
                arr[i] = t;
            }
            return arr;
        }
    };

    // --- CONTENT ARRAYS (Vocabulary for Generation) ---
    const content = {
        titleAdjectives: ["Crimson", "Forgotten", "Silent", "Whispering", "Lost", "Golden", "Iron", "Quantum", "Cosmic", "Abyssal", "Eternal", "Shadow", "Crystal", "Obsidian"],
        titleNouns: ["Scroll", "Codex", "Sun", "Moon", "Star", "Planet", "Algorithm", "Key", "Door", "Path", "Echo", "Void", "Heart", "Cipher", "Oracle", "Labyrinth", "Garden"],
        titleStructures: [
            (adj, noun) => `The ${adj} ${noun}`,
            (adj, noun) => `Secrets of the ${adj} ${noun}`,
            (adj, noun) => `${noun} of ${adj} Light`,
            (adj, noun) => `Chronicles of the ${adj} ${noun}`,
            (adj, noun) => `A Whisper of the ${adj} ${noun}`
        ],
        authorFirstNames: ["Elara", "Kael", "Seraphina", "Orion", "Lyra", "Jasper", "Rowan", "Astrid", "Finnian", "Mira", "Zephyr", "Cassia"],
        authorLastNames: ["Vance", "Moonwhisper", "Starfield", "Ironhand", "Shadowwalker", "Corelia", "Bryce", "Silverwood", "Nightshade", "Stormrider"],
        
        characterNouns: ["captain", "librarian", "alchemist", "pilot", "explorer", "cipher", "dreamer", "guardian", "seeker", "artisan", "nomad", "scholar"],
        characterAdjectives: ["weary", "bold", "enigmatic", "reluctant", "curious", "haunted", "optimistic", "stoic", "resourceful", "grizzled"],
        characterMotivations: [
            "to find a lost home", "to uncover a hidden truth", "to protect a loved one", 
            "to seek redemption", "to achieve ultimate power", "to escape a prophecy",
            "to forge a new alliance", "to understand an ancient mystery", "to preserve a dying art"
        ],

        settingTypes: [
            "a sprawling megacity", "an ancient forest", "a desolate wasteland", 
            "a floating sky-island", "a deep-space station", "a virtual realm", 
            "a forgotten temple", "a subterranean kingdom", "a storm-wracked archipelago"
        ],
        settingDescriptors: [
            "shrouded in mist", "gleaming with advanced tech", "crumbled by time", 
            "pulsating with strange energy", "haunted by echoes of the past",
            "bathed in perpetual twilight", "rich with undiscovered flora", "frozen in an unnatural winter"
        ],

        plotVerbs: ["discovers", "unearths", "confronts", "must navigate", "races against", "deciphers", "protects", "escapes", "investigates"],
        plotObjects: [
            "an ancient artifact", "a forbidden technology", "a cryptic message", 
            "a cosmic anomaly", "a rival faction", "their own destiny", "a forgotten civilization",
            "a powerful energy source", "a legendary creature"
        ],
        plotTwists: [
            "an ally is revealed to be a traitor", "the supposed villain had noble intentions", 
            "the prophecy was a carefully constructed lie", "the entire world is a simulation", 
            "they are unknowingly part of a larger, repeating cycle", "the artifact they seek is sentient",
            "their mentor is the true antagonist", "the safe haven is actually a trap"
        ],

        chapterTitleTemplates: {
            0: ["The Call of {NOUN}", "An Unexpected {EVENT}", "The {ADJECTIVE} Discovery", "Genesis of {CONCEPT}"],
            1: ["Journey to {PLACE}", "The Trials of {CONCEPT}", "Secrets of the {MYSTERY_NOUN}", "Across the {LANDSCAPE}"],
            2: ["Confronting the {ANTAGONIST_TYPE}", "The Heart of the {MYSTERY_NOUN}", "Revelations in {PLACE}", "A Choice of {DILEMMA}"],
            3: ["The Climax at {PLACE}", "Turning the {TIDE_NOUN}", "The {ADJECTIVE} Gambit", "Sacrifice for {GOAL}"],
            4: ["Echoes of {PAST_EVENT}", "A New {BEGINNING_NOUN}", "The Legacy of {HERO_OR_EVENT}", "Beyond the {HORIZON_NOUN}"]
        },
        // Nouns/events etc for chapter titles
        chapterNouns: ["the Void", "Destiny", "the Ancients", "the Unknown", "Hope", "Despair", "the Machine"],
        chapterEvents: ["Encounter", "Signal", "Storm", "Awakening", "Betrayal", "Alliance"],
        chapterAdjectives: ["Lost", "Final", "Hidden", "Crimson", "Silent", "Forgotten"],
        chapterPlaces: ["the Citadel", "the Forbidden Zone", "Xylos", "the Archive", "the Shattered Plains"],
        chapterConcepts: ["Time", "Fate", "Knowledge", "Power", "Freedom", "Order"],
        chapterMysteryNouns: ["Oracle", "Cipher", "Relic", "Anomaly", "Source"],
        chapterLandscapes: ["Wastes", "Stars", "Depths", "Ruins"],
        chapterAntagonistTypes: ["Shadow", "Machine", "Empire", "Cult", "Curse"],
        chapterDilemmas: ["Loyalty", "Sacrifice", "Truth", "Survival"],
        chapterTideNouns: ["Tide", "Tables", "Path", "War"],
        chapterGoals: ["the Future", "Peace", "the Truth", "Salvation"],
        chapterPastEvents: ["the Fall", "the Great War", "the Silence", "the Awakening"],
        chapterBeginningNouns: ["Dawn", "Era", "Path", "Hope"],
        chapterHorizonNouns: ["Horizon", "Void", "Future", "Unknown"],

        sentenceStarters: ["The wind whispered", "A single light pulsed", "Silence hung heavy", "It all began with", "The old records mentioned"],
        connectors: ["however", "therefore", "meanwhile", "as a result", "furthermore", "in contrast", "suddenly", "unexpectedly"],
        actionVerbs: ["raced", "climbed", "activated", "decoded", "observed", "retreated", "advanced", "negotiated"],
        descriptiveAdjectives: ["vast", "eerie", "ancient", "luminescent", "ominous", "serene", "chaotic", "intricate"]
    };

    // --- HELPER FUNCTIONS ---
    function getUrlParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    function generateRandomSeed(length = 12) {
        const words = ["Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma", "Orion", "Nova", "Cygnus", "Draco", "Lyra", "Phoenix", "Quasar", "Nebula", "Comet"];
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let seed = "";
        // Use Math.random for generating the random seed itself, not the PRNG meant for book content.
        seed += words[Math.floor(Math.random() * words.length)];
        seed += words[Math.floor(Math.random() * words.length)];
        
        let remainingLength = length - seed.length;
        if (remainingLength < 0) remainingLength = 0; // Ensure it's not negative

        for (let i = 0; i < remainingLength; i++) {
             seed += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // If the seed is still too short (e.g. very short words picked), pad with numbers
        if (seed.length < length -3 && length > 5) { // Ensure there's space for numbers
            while(seed.length < length) {
                 seed += Math.floor(Math.random() * 10);
            }
        } else if (seed.length > length) {
            seed = seed.substring(0, length);
        }
        
        return seed.replace(/\s+/g, ''); // Remove spaces if any (shouldn't be any now)
    }
    
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // --- DARK MODE ---
    let currentTheme = localStorage.getItem('theme') || 'light';
    function applyTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        const toggleButton = document.getElementById('darkModeToggle');
        if (toggleButton) {
            toggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        currentTheme = theme;
        localStorage.setItem('theme', theme);
    }

    function toggleDarkMode() {
        applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    }


    // --- BOOK GENERATION LOGIC ---
    function generateBookTitle(baseSeed) {
        PRNG.init(baseSeed + "title");
        const structure = PRNG.pick(content.titleStructures);
        const adj = PRNG.pick(content.titleAdjectives);
        const noun = PRNG.pick(content.titleNouns);
        return structure(adj, noun);
    }

    function generateAuthorName(baseSeed) {
        PRNG.init(baseSeed + "author");
        const firstName = PRNG.pick(content.authorFirstNames);
        const lastName = PRNG.pick(content.authorLastNames);
        return `${firstName} ${lastName}`;
    }

    function applyCoverStyle(coverElement, titleElement, authorElement, bookSeed) {
        // Background
        PRNG.init(bookSeed + "cover_bg_type");
        const bgType = PRNG.range(0, 3); // 0: solid, 1: linear, 2: radial

        PRNG.init(bookSeed + "cover_hue1"); const hue1 = PRNG.range(0, 360);
        PRNG.init(bookSeed + "cover_sat1"); const sat1 = PRNG.range(40, 80);
        PRNG.init(bookSeed + "cover_light1"); const light1 = PRNG.range(25, 60); 
        const color1 = `hsl(${hue1}, ${sat1}%, ${light1}%)`;

        let bgCss;
        if (bgType === 0) {
            bgCss = color1;
        } else {
            PRNG.init(bookSeed + "cover_hue2"); const hue2 = (hue1 + PRNG.range(30, 150)) % 360;
            PRNG.init(bookSeed + "cover_sat2"); const sat2 = PRNG.range(40, 80);
            PRNG.init(bookSeed + "cover_light2"); const light2 = PRNG.range(25, 60);
            const color2 = `hsl(${hue2}, ${sat2}%, ${light2}%)`;
            PRNG.init(bookSeed + "cover_gradient_angle"); const angle = PRNG.range(0, 360);
            bgCss = bgType === 1 ? `linear-gradient(${angle}deg, ${color1}, ${color2})` : `radial-gradient(circle, ${color1}, ${color2})`;
        }
        coverElement.style.background = bgCss;

        const avgLightness = (light1 + (bgType > 0 ? light1 : light1)) / 2; 
        const textColor = avgLightness > 50 ? '#111' : '#f0f0f0';
        titleElement.style.color = textColor;
        authorElement.style.color = textColor;
        
        PRNG.init(bookSeed + "cover_font_style");
        const fontClasses = ["cover-font-serif", "cover-font-sans-serif", "cover-font-monospace"];
        coverElement.classList.remove(...fontClasses); // Clear previous
        fontClasses.forEach(cls => coverElement.classList.remove(cls)); // Ensure all are removed
        coverElement.classList.add(PRNG.pick(fontClasses));


        const motifContainer = coverElement.querySelector('.motif-container');
        if (motifContainer) {
            motifContainer.innerHTML = ''; 
            PRNG.init(bookSeed + "cover_motif");
            const motifType = PRNG.range(0, 4); 
            let motifHtml = '';
            if (motifType !== 0) motifContainer.style.color = textColor; 
            if (motifType === 1) motifHtml = '<div class="motif motif-circle"></div>';
            else if (motifType === 2) motifHtml = '<div class="motif motif-square"></div>';
            else if (motifType === 3) motifHtml = '<div class="motif motif-triangle"></div>';
            motifContainer.innerHTML = motifHtml;
        }

        PRNG.init(bookSeed + "cover_border_type");
        if (PRNG.random() < 0.5) { 
            PRNG.init(bookSeed + "cover_border_color_offset");
            const borderHue = (hue1 + PRNG.range(60, 120)) % 360;
            const borderColor = `hsl(${borderHue}, ${sat1}%, ${Math.max(10, light1 - 15)}%)`;
            coverElement.style.border = `8px solid ${borderColor}`;
        } else {
            coverElement.style.border = `8px solid transparent`;
        }
    }

    function generateSentence(baseSeed, paragraphTypeSeed, protagonist, setting) {
        PRNG.init(baseSeed + paragraphTypeSeed + "sentence_struct");
        let sentence = "";
        const structType = PRNG.range(0, 5);

        const currentProtagonist = protagonist || PRNG.pick(content.characterNouns);
        const currentSetting = setting || PRNG.pick(content.settingTypes);

        switch (structType) {
            case 0: 
                sentence = `${capitalizeFirstLetter(currentProtagonist)} ${PRNG.pick(content.actionVerbs)} towards the ${PRNG.pick(content.descriptiveAdjectives)} ${PRNG.pick(content.titleNouns)}.`;
                break;
            case 1: 
                sentence = `The ${currentSetting} was ${PRNG.pick(content.settingDescriptors)}, filled with ${PRNG.pick(content.descriptiveAdjectives)} shadows and ${PRNG.pick(content.descriptiveAdjectives)} echoes.`;
                break;
            case 2: 
                sentence = `${capitalizeFirstLetter(currentProtagonist)} pondered their mission: ${PRNG.pick(content.characterMotivations)}.`;
                break;
            case 3: 
                sentence = `${PRNG.pick(content.sentenceStarters)}, a ${PRNG.pick(content.descriptiveAdjectives)} ${PRNG.pick(content.plotObjects)} ${PRNG.pick(content.plotVerbs)} from the depths of ${currentSetting}.`;
                break;
            case 4: 
                sentence = `${capitalizeFirstLetter(PRNG.pick(content.connectors))}, the path ahead seemed even more ${PRNG.pick(content.descriptiveAdjectives)}.`;
                break;
        }
        return sentence;
    }

    function generateParagraph(baseSeed, chapterIndex, paragraphIndex, protagonist, setting) {
        PRNG.init(baseSeed + `ch${chapterIndex}p${paragraphIndex}`);
        const numSentences = PRNG.range(SENTENCES_PER_PARAGRAPH_MIN, SENTENCES_PER_PARAGRAPH_MAX + 1);
        let paragraph = "";
        for (let i = 0; i < numSentences; i++) {
            const sentenceSeed = `s${i}`;
            paragraph += generateSentence(baseSeed, `ch${chapterIndex}p${paragraphIndex}${sentenceSeed}`, protagonist, setting) + " ";
        }
        return paragraph.trim();
    }
    
    function generateChapterTitle(baseSeed, chapterIndex) {
        PRNG.init(baseSeed + `ch${chapterIndex}title`);
        const templates = content.chapterTitleTemplates[chapterIndex % Object.keys(content.chapterTitleTemplates).length] || content.chapterTitleTemplates[0];
        let titleTemplate = PRNG.pick(templates);

        titleTemplate = titleTemplate.replace(/{NOUN}/g, () => PRNG.pick(content.chapterNouns))
                                     .replace(/{EVENT}/g, () => PRNG.pick(content.chapterEvents))
                                     .replace(/{ADJECTIVE}/g, () => PRNG.pick(content.chapterAdjectives))
                                     .replace(/{PLACE}/g, () => PRNG.pick(content.chapterPlaces))
                                     .replace(/{CONCEPT}/g, () => PRNG.pick(content.chapterConcepts))
                                     .replace(/{MYSTERY_NOUN}/g, () => PRNG.pick(content.chapterMysteryNouns))
                                     .replace(/{LANDSCAPE}/g, () => PRNG.pick(content.chapterLandscapes))
                                     .replace(/{ANTAGONIST_TYPE}/g, () => PRNG.pick(content.chapterAntagonistTypes))
                                     .replace(/{DILEMMA}/g, () => PRNG.pick(content.chapterDilemmas))
                                     .replace(/{TIDE_NOUN}/g, () => PRNG.pick(content.chapterTideNouns))
                                     .replace(/{GOAL}/g, () => PRNG.pick(content.chapterGoals))
                                     .replace(/{PAST_EVENT}/g, () => PRNG.pick(content.chapterPastEvents))
                                     .replace(/{BEGINNING_NOUN}/g, () => PRNG.pick(content.chapterBeginningNouns))
                                     .replace(/{HORIZON_NOUN}/g, () => PRNG.pick(content.chapterHorizonNouns));

        return `Chapter ${chapterIndex + 1}: ${titleTemplate}`;
    }


    function generateChapterContent(baseSeed, chapterIndex, bookData) {
        PRNG.init(baseSeed + `ch${chapterIndex}content`);
        const numParagraphs = PRNG.range(PARAGRAPHS_PER_CHAPTER_MIN, PARAGRAPHS_PER_CHAPTER_MAX + 1);
        let chapterHTML = "";

        const protagonist = bookData.protagonist;
        const mainSetting = bookData.mainSetting;

        for (let i = 0; i < numParagraphs; i++) {
            chapterHTML += `<p>${generateParagraph(baseSeed, chapterIndex, i, protagonist, mainSetting)}</p>`;
        }
        return chapterHTML;
    }

    let currentBookData = null; 
    let currentChapterIndex = 0;

    function displayChapter(index) {
        if (!currentBookData || !currentBookData.chapters[index]) return;

        currentChapterIndex = index;
        document.getElementById('chapterTitle').textContent = currentBookData.chapters[index].title;
        document.getElementById('chapterText').innerHTML = currentBookData.chapters[index].content;
        
        document.getElementById('chapterIndicator').textContent = `Chapter ${index + 1} of ${NUM_CHAPTERS}`;
        document.getElementById('prevChapterBtn').disabled = (index === 0);
        document.getElementById('nextChapterBtn').disabled = (index === NUM_CHAPTERS - 1);

        const contentArea = document.querySelector('.book-content');
        if (contentArea) contentArea.scrollTop = 0; 
        else window.scrollTo(0, document.querySelector('.book-layout')?.offsetTop || 0); 
    }


    // --- INITIALIZATION ---
    function initIndexPage() {
        document.getElementById('goToBookBtn').addEventListener('click', () => {
            const bookId = document.getElementById('bookIdInput').value.trim();
            if (bookId) {
                window.location.href = `book.html?id=${encodeURIComponent(bookId)}`;
            } else {
                alert("Please enter a Book Title or Seed ID.");
            }
        });

        document.getElementById('randomBookBtn').addEventListener('click', () => {
            const randomSeed = generateRandomSeed();
            window.location.href = `book.html?id=${encodeURIComponent(randomSeed)}`;
        });
        
        document.querySelectorAll('.book-spine').forEach(spine => {
            // Use Math.random for purely decorative, non-deterministic styling
            const hues = [25, 40, 190, 220, 280]; 
            spine.style.backgroundColor = `hsl(${hues[Math.floor(Math.random() * hues.length)]}, ${Math.floor(Math.random() * 21) + 30}%, ${Math.floor(Math.random() * 21) + 30}%)`;
            spine.style.height = `${Math.floor(Math.random() * 41) + 140}px`;
        });
    }

    function initBookPage() {
        const bookSeed = getUrlParam('id');
        if (!bookSeed) {
            alert("No book ID provided. Redirecting to library.");
            window.location.href = 'index.html';
            return;
        }
        
        document.getElementById('bookSeedInfo').textContent = `Book Seed: ${bookSeed}`;

        PRNG.init(bookSeed + "main_protagonist");
        const protagonist = `${PRNG.pick(content.characterAdjectives)} ${PRNG.pick(content.characterNouns)}`;
        PRNG.init(bookSeed + "main_setting");
        const mainSetting = `${PRNG.pick(content.settingTypes)}, ${PRNG.pick(content.settingDescriptors)}`;

        currentBookData = {
            seed: bookSeed,
            title: generateBookTitle(bookSeed),
            author: generateAuthorName(bookSeed),
            protagonist: protagonist,
            mainSetting: mainSetting,
            chapters: []
        };

        document.title = `${currentBookData.title} - Infinite Library`;
        document.getElementById('bookTitleMeta').textContent = currentBookData.title;
        document.getElementById('authorNameMeta').textContent = `by ${currentBookData.author}`;
        
        const coverTitleEl = document.getElementById('coverTitle');
        const coverAuthorEl = document.getElementById('coverAuthor');
        coverTitleEl.textContent = currentBookData.title;
        coverAuthorEl.textContent = currentBookData.author;
        applyCoverStyle(
            document.getElementById('bookCover'),
            coverTitleEl,
            coverAuthorEl,
            bookSeed
        );
        
        for (let i = 0; i < NUM_CHAPTERS; i++) {
            currentBookData.chapters.push({
                title: generateChapterTitle(bookSeed, i),
                content: generateChapterContent(bookSeed, i, currentBookData)
            });
        }

        displayChapter(0); 

        document.getElementById('prevChapterBtn').addEventListener('click', () => {
            if (currentChapterIndex > 0) displayChapter(currentChapterIndex - 1);
        });
        document.getElementById('nextChapterBtn').addEventListener('click', () => {
            if (currentChapterIndex < NUM_CHAPTERS - 1) displayChapter(currentChapterIndex + 1);
        });
        document.getElementById('printBookBtn').addEventListener('click', () => {
            window.print();
        });
    }
    
    return {
        init: function() {
            applyTheme(currentTheme); 
            const darkModeButton = document.getElementById('darkModeToggle');
            if (darkModeButton) {
                darkModeButton.addEventListener('click', toggleDarkMode);
            }

            if (document.getElementById('libraryHomepage')) {
                initIndexPage();
            } else if (document.getElementById('bookViewerPage')) {
                initBookPage();
            }
        }
    };

})();

document.addEventListener('DOMContentLoaded', InfiniteLibrary.init);