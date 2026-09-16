/* Genera supabase-seed-srd.sql a partir del SRD 5.1 (Creative Commons CC-BY 4.0)
 * servido por Open5e (https://api.open5e.com, documento wotc-srd).
 *
 * Traducción:
 *  - Nombres de monstruos y hechizos: glosario canónico propio (abajo).
 *  - Términos mecánicos (escuelas, tipos, tamaños, alineamientos): mapa propio.
 *  - Prosa (descripciones, acciones, habilidades): traducción automática
 *    vía el endpoint público translate.googleapis.com (client=gtx), con caché
 *    en disco (srd-cache.json) y correcciones terminológicas posteriores.
 *
 * Uso: node build-srd.js
 */
"use strict";

const fs = require("fs");
const API = "https://api.open5e.com/v1";
const DOC = "wotc-srd";
const MT_URL = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=";
const BATCH = 40; // filas por INSERT
const CACHE_FILE = "srd-cache.json";

/* ---------------- Glosarios canónicos (ES) ---------------- */

const SCHOOLS = { Abjuration: "Abjuración", Conjuration: "Conjuración", Divination: "Adivinación", Enchantment: "Encantamiento", Evocation: "Evocación", Illusion: "Ilusión", Necromancy: "Nigromancia", Transmutation: "Transmutación" };
const TYPES = { aberration: "Aberración", beast: "Bestia", celestial: "Celestial", construct: "Constructo", dragon: "Dragón", elemental: "Elemental", fey: "Hada", fiend: "Demonio", giant: "Gigante", humanoid: "Humanoide", monstrosity: "Monstruosidad", ooze: "Limo", plant: "Planta", undead: "No muerto" };
const SIZES = { Tiny: "Diminuto", Small: "Pequeño", Medium: "Mediano", Large: "Grande", Huge: "Enorme", Gargantuan: "Colosal", Varies: "Variable" };

/* Nombres canónicos de monstruos (SRD 5.1 → ES) */
const MONSTER_NAMES = {
  "Aboleth": "Aboleth", "Adult Red Dragon": "Dragón rojo adulto", "Adult Blue Dragon": "Dragón azul adulto", "Adult Green Dragon": "Dragón verde adulto", "Adult Black Dragon": "Dragón negro adulto", "Adult White Dragon": "Dragón blanco adulto", "Adult Brass Dragon": "Dragón de latón adulto", "Adult Bronze Dragon": "Dragón de bronce adulto", "Adult Copper Dragon": "Dragón de cobre adulto", "Adult Gold Dragon": "Dragón dorado adulto", "Adult Silver Dragon": "Dragón plateado adulto", "Air Elemental": "Elemental de aire", "Ancient Black Dragon": "Dragón negro anciano", "Ancient Blue Dragon": "Dragón azul anciano", "Ancient Brass Dragon": "Dragón de latón anciano", "Ancient Bronze Dragon": "Dragón de bronce anciano", "Ancient Copper Dragon": "Dragón de cobre anciano", "Ancient Gold Dragon": "Dragón dorado anciano", "Ancient Green Dragon": "Dragón verde anciano", "Ancient Red Dragon": "Dragón rojo anciano", "Ancient Silver Dragon": "Dragón plateado anciano", "Ancient White Dragon": "Dragón blanco anciano", "Acolyte": "Acólito", "Androsphinx": "Androesfinge", "Animated Armor": "Armadura animada", "Animated Shield": "Escudo animado", "Ankheg": "Ankheg", "Ape": "Simio", "Archmage": "Arquimago", "Assassin": "Asesino", "Azer": "Azer", "Awakened Shrub": "Arbusto despierto", "Awakened Tree": "Árbol despierto", "Axe Beak": "Pico de hacha", "Baboon": "Babuino", "Badger": "Tejón", "Balor": "Balor", "Bandit": "Bandido", "Bandit Captain": "Capitán bandido", "Banshee": "Banshi", "Barbed Devil": "Diablo barbado", "Basilisk": "Basilisco", "Bat": "Murciélago", "Bearded Devil": "Diablo barbudo", "Behir": "Behir", "Beholder Zombie": "Zombi beholder", "Berserker": "Berserker", "Black Bear": "Oso negro", "Black Dragon Wyrmling": "Cría de dragón negro", "Black Pudding": "Pudín negro", "Blood Hawk": "Halcón sangriento", "Blue Dragon Wyrmling": "Cría de dragón azul", "Blue Slaad": "Slaad azul", "Boar": "Jabalí", "Bone Devil": "Diablo de huesos", "Bone Naga": "Naga de huesos", "Brass Dragon Wyrmling": "Cría de dragón de latón", "Bronze Dragon Wyrmling": "Cría de dragón de bronce", "Brown Bear": "Oso pardo", "Bugbear": "Bugbear", "Bulette": "Bulette", "Camel": "Camello", "Cat": "Gato", "Centaur": "Centauro", "Chain Devil": "Diablo de cadenas", "Chimera": "Quimera", "Chuul": "Chuul", "Clay Golem": "Gólem de arcilla", "Cloaker": "Cloaker", "Cloud Giant": "Gigante de la niebla", "Cockatrice": "Cockatrice", "Commoner": "Plebeyo", "Constrictor Snake": "Serpiente constrictora", "Copper Dragon Wyrmling": "Cría de dragón de cobre", "Couatl": "Couatl", "Crab": "Cangrejo", "Crocodile": "Cocodrilo", "Cult Fanatic": "Fanático de culto", "Cultist": "Cultista", "Darkmantle": "Darkmantle", "Death Dog": "Perro de la muerte", "Deep Gnome (Svirfneblin)": "Gnomo profundo (svirfneblin)", "Deer": "Ciervo", "Demilich": "Semilich", "Deva": "Deva", "Dire Wolf": "Lobo dire", "Djinni": "Djinni", "Doppelganger": "Doppelganger", "Draft Horse": "Caballo de tiro", "Dragon Turtle": "Tortuga dragón", "Dretch": "Dretch", "Drider": "Dríder", "Drow": "Drow", "Druid": "Druida", "Dryad": "Dríada", "Duergar": "Duergar", "Dust Mephit": "Mefit de polvo", "Eagle": "Águila", "Earth Elemental": "Elemental de tierra", "Efreeti": "Efrit", "Elder Tempest": "Tempestad anciana", "Elephant": "Elefante", "Elk": "Alce", "Erinyes": "Erinia", "Ettercap": "Ettercap", "Ettin": "Ettin", "Fire Elemental": "Elemental de fuego", "Fire Giant": "Gigante de fuego", "Fire Snake": "Serpiente de fuego", "Flameskull": "Cráneo llameante", "Flumph": "Flumph", "Flying Snake": "Serpiente voladora", "Flying Sword": "Espada voladora", "Frog": "Rana", "Frost Giant": "Gigante de escarcha", "Flesh Golem": "Gólem de carne", "Gargoyle": "Gárgola", "Gas Spore": "Espora gaseosa", "Gelatinous Cube": "Cubo gelatinoso", "Ghast": "Ghast", "Ghost": "Fantasma", "Ghoul": "Ghoul", "Giant Ape": "Simio gigante", "Giant Bat": "Murciélago gigante", "Giant Badger": "Tejón gigante", "Giant Boar": "Jabalí gigante", "Giant Centipede": "Ciempiés gigante", "Giant Constrictor Snake": "Serpiente constrictora gigante", "Giant Crab": "Cangrejo gigante", "Giant Crocodile": "Cocodrilo gigante", "Giant Eagle": "Águila gigante", "Giant Elk": "Alce gigante", "Giant Fire Beetle": "Escarabajo de fuego gigante", "Giant Frog": "Rana gigante", "Giant Goat": "Cabra gigante", "Giant Hyena": "Hiena gigante", "Giant Lizard": "Lagarto gigante", "Giant Octopus": "Pulpo gigante", "Giant Owl": "Búho gigante", "Giant Poisonous Snake": "Serpiente venenosa gigante", "Giant Rat": "Rata gigante", "Giant Rat (Diseased)": "Rata gigante (enferma)", "Giant Scorpion": "Escorpión gigante", "Giant Sea Horse": "Caballito de mar gigante", "Giant Seahorse": "Caballito de mar gigante", "Giant Shark": "Tiburón gigante", "Giant Spider": "Araña gigante", "Giant Toad": "Sapo gigante", "Giant Vulture": "Buitre gigante", "Giant Wasp": "Avispa gigante", "Giant Weasel": "Comadreja gigante", "Giant Wolf Spider": "Araña lobo gigante", "Gibbering Mouther": "Boca balbuceante", "Githyanki": "Githyanki", "Githzerai": "Githzerai", "Glabrezu": "Glabrezu", "Gladiator": "Gladiador", "Gnoll": "Gnoll", "Goat": "Cabra", "Goblin": "Goblin", "Goblin Boss": "Jefe goblin", "Gold Dragon Wyrmling": "Cría de dragón dorado", "Gorgon": "Gorgona", "Gray Ooze": "Limo gris", "Gray Slaad": "Slaad gris", "Green Dragon Wyrmling": "Cría de dragón verde", "Green Hag": "Bruja verde", "Grick": "Grick", "Griffon": "Grifo", "Grimlock": "Grimlock", "Guard": "Guardia", "Guardian Naga": "Naga guardián", "Gynosphinx": "Esfinge hembra", "Half-Red Dragon Veteran": "Veterano medio dragón rojo", "Harpy": "Arpía", "Hawk": "Halcón", "Hell Hound": "Can del infierno", "Hezrou": "Hezrou", "Hill Giant": "Gigante de la colina", "Hippogriff": "Hipogrifo", "Hobgoblin": "Hobgoblin", "Homunculus": "Homúnculo", "Horned Devil": "Diablo cornudo", "Hunter Shark": "Tiburón cazador", "Hydra": "Hidra", "Hyena": "Hiena", "Ice Devil": "Diablo de hielo", "Ice Mephit": "Mefit de hielo", "Imp": "Diablillo", "Invisible Stalker": "Acechador invisible", "Iron Golem": "Gólem de hierro", "Jackal": "Chacal", "Jackalwere": "Chacalwere", "Killer Whale": "Orca", "Knight": "Caballero", "Kobold": "Kobold", "Kraken": "Kraken", "Lamia": "Lamia", "Lemure": "Lemure", "Lich": "Lich", "Lion": "León", "Lizard": "Lagarto", "Lizardfolk": "Hombres lagarto", "Magma Mephit": "Mefit de magma", "Mage": "Mago", "Magmin": "Magmin", "Mammoth": "Mamut", "Manticore": "Manticora", "Marilith": "Marilith", "Mastiff": "Mastín", "Medusa": "Medusa", "Merfolk": "Tritón", "Merrow": "Merrow", "Mimic": "Mímico", "Minotaur": "Minotauro", "Minotaur Skeleton": "Esqueleto de minotauro", "Mule": "Mula", "Mummy": "Momia", "Mummy Lord": "Señor momia", "Nalfeshnee": "Nalfeshnee", "Night Hag": "Bruja nocturna", "Nightmare": "Pesadilla", "Noble": "Noble", "Ochre Jelly": "Gel ocre", "Octopus": "Pulpo", "Ogre": "Ogro", "Ogre Zombie": "Ogro zombi", "Oni": "Oni", "Orc": "Orco", "Otyugh": "Otyugh", "Owl": "Búho", "Owlbear": "Búho-oso", "Panther": "Pantera", "Pegasus": "Pegaso", "Phase Spider": "Araña fasal", "Pit Fiend": "Pit Fiend", "Pixie": "Duende", "Planetar": "Planetar", "Plesiosaurus": "Plesiosaurio", "Poisonous Snake": "Serpiente venenosa", "Polar Bear": "Oso polar", "Pony": "Pony", "Priest": "Sacerdote", "Pseudodragon": "Pseudodragón", "Purple Worm": "Gusano púrpura", "Quasit": "Quasit", "Quipper": "Quipper", "Rakshasa": "Rakshasa", "Rat": "Rata", "Raven": "Cuervo", "Red Dragon Wyrmling": "Cría de dragón rojo", "Reef Shark": "Tiburón de arrecife", "Remorhaz": "Remorhaz", "Rhinoceros": "Rinoceronte", "Riding Horse": "Caballo de montura", "Roc": "Roc", "Roper": "Roper", "Rug of Smothering": "Alfombra asfixiante", "Rust Monster": "Monstruo oxidante", "Sahuagin": "Sahuagin", "Salamander": "Salamandra", "Satyr": "Sátiro", "Scorpion": "Escorpión", "Scout": "Explorador", "Sea Hag": "Bruja del mar", "Sea Horse": "Caballito de mar", "Shadow": "Sombra", "Shambling Mound": "Túmulo andante", "Shield Guardian": "Guardián de escudo", "Shrieker": "Hongo chillón", "Silver Dragon Wyrmling": "Cría de dragón plateado", "Skeleton": "Esqueleto", "Smoke Mephit": "Mefit de humo", "Solar": "Solar", "Specter": "Espectro", "Sphinx of Black Quartz": "Esfinge de cuarzo negro", "Spider": "Araña", "Spirit Naga": "Naga espiritual", "Sprite": "Duendecillo", "Spy": "Espía", "Steam Mephit": "Mefit de vapor", "Stirge": "Estirge", "Stone Giant": "Gigante de piedra", "Stone Golem": "Gólem de piedra", "Storm Giant": "Gigante de la tormenta", "Succubus/Incubus": "Súcubo/Íncubo", "Swarm of Bats": "Enjambre de murciélagos", "Swarm of Beetles": "Enjambre de escarabajos", "Swarm of Centipedes": "Enjambre de ciempiés", "Swarm of Insects": "Enjambre de insectos", "Swarm of Poisonous Snakes": "Enjambre de serpientes venenosas", "Swarm of Quippers": "Enjambre de quippers", "Swarm of Rats": "Enjambre de ratas", "Swarm of Ravens": "Enjambre de cuervos", "Swarm of Spiders": "Enjambre de arañas", "Swarm of Wasps": "Enjambre de avispas", "Tarrasque": "Tarrasque", "Thug": "Matón", "Tiger": "Tigre", "Treant": "Treant", "Tribal Warrior": "Guerrero tribal", "Triceratops": "Triceratops", "Troglodyte": "Troglodita", "Troll": "Trol", "Tyrannosaurus Rex": "Tiranosaurio rex", "Unicorn": "Unicornio", "Vampire": "Vampiro", "Vampire Spawn": "Engendro vampírico", "Velociraptor": "Velociraptor", "Veteran": "Veterano", "Violet Fungus": "Hongo violeta", "Vrock": "Vrock", "Vulture": "Buitre", "Warhorse": "Corcel de guerra", "Warhorse Skeleton": "Esqueleto de corcel de guerra", "Water Elemental": "Elemental de agua", "Water Weird": "Genio del agua", "Weasel": "Comadreja", "Werebear": "Hombre oso", "Wereboar": "Hombre jabalí", "Wererat": "Hombre rata", "Weretiger": "Hombre tigre", "Werewolf": "Hombre lobo", "White Dragon Wyrmling": "Cría de dragón blanco", "Wight": "Wight", "Will-o'-Wisp": "Fuego fatuo", "Winter Wolf": "Lobo invernal", "Wolf": "Lobo", "Worg": "Worg", "Wraith": "Espectro funesto", "Wyvern": "Viverna", "Xorn": "Xorn", "Yeti": "Yeti",  "Yuan-ti Pureblood": "Yuan-ti de sangre pura", "Zombie": "Zombi", "Blink Dog": "Perro parpadeante", "Saber-Toothed Tiger": "Tigre dientes de sable", "Young Black Dragon": "Dragón negro joven", "Young Blue Dragon": "Dragón azul joven", "Young Brass Dragon": "Dragón de latón joven", "Young Bronze Dragon": "Dragón de bronce joven", "Young Copper Dragon": "Dragón de cobre joven", "Young Gold Dragon": "Dragón dorado joven", "Young Green Dragon": "Dragón verde joven", "Young Red Dragon": "Dragón rojo joven", "Young Silver Dragon": "Dragón plateado joven", "Young White Dragon": "Dragón blanco joven"
};

/* Nombres canónicos de hechizos (SRD 5.1 → ES) */
const SPELL_NAMES = {
  "Acid Arrow": "Flecha ácida", "Melf's Acid Arrow": "Flecha ácida de Melf", "Acid Splash": "Salpicadura de ácido", "Aid": "Auxilio", "Alarm": "Alarma", "Alter Self": "Alterarse", "Animal Friendship": "Amistad con los animales", "Animal Messenger": "Mensajero animal", "Animal Shapes": "Formas animales", "Animate Dead": "Animar muertos", "Animate Objects": "Animar objetos", "Antilife Shell": "Barrera antivida", "Antimagic Field": "Campo antimágico", "Antipathy/Sympathy": "Antipatía/Simpatía", "Arcane Eye": "Ojo arcano", "Arcane Hand": "Mano arcana", "Bigby's Hand": "Mano de Bigby", "Arcane Lock": "Cerradura arcana", "Arcane Sword": "Espada arcana", "Mordenkainen's Sword": "Espada de Mordenkainen", "Arcanist's Magic Aura": "Aura mágica del arcanista", "Nystul's Magic Aura": "Aura mágica de Nystul", "Astral Projection": "Proyección astral", "Augury": "Augurio", "Awaken": "Despertar", "Bane": "Perdición", "Banishment": "Destierro", "Barkskin": "Piel de corteza", "Beacon of Hope": "Faro de esperanza", "Bestow Curse": "Imponer maldición", "Black Tentacles": "Tentáculos negros", "Evard's Black Tentacles": "Tentáculos negros de Evard", "Blade Barrier": "Barrera de cuchillas", "Bless": "Bendición", "Blight": "Plaga", "Blindness/Deafness": "Ceguera/Sordera", "Blink": "Parpadear", "Blur": "Desdibujarse", "Branding Smite": "Castigo imperecedero", "Burning Hands": "Manos ardientes", "Call Lightning": "Invocar relámpagos", "Calm Emotions": "Calmar emociones", "Chain Lightning": "Relámpago encadenado", "Charm Person": "Encantar persona", "Chill Touch": "Toque escalofriante", "Circle of Death": "Círculo de muerte", "Clairvoyance": "Clarividencia", "Clone": "Clonar", "Cloudkill": "Nube letal", "Color Spray": "Chorro de colores", "Command": "Orden", "Commune": "Comulgar", "Commune with Nature": "Comulgar con la naturaleza", "Compulsion": "Compulsión", "Comprehend Languages": "Comprender idiomas", "Cone of Cold": "Cono de frío", "Confusion": "Confusión", "Conjure Animals": "Conjurar animales", "Conjure Celestial": "Conjurar celestial", "Conjure Elemental": "Conjurar elemental", "Conjure Fey": "Conjurar hada", "Conjure Minor Elementals": "Conjurar elementales menores", "Conjure Woodland Beings": "Conjurar seres del bosque", "Contact Other Plane": "Contactar con otro plano", "Contagion": "Contagio", "Contingency": "Contingencia", "Continual Flame": "Llama continua", "Control Water": "Controlar el agua", "Control Weather": "Controlar el clima", "Counterspell": "Contrahechizo", "Create Food and Water": "Crear comida y agua", "Create or Destroy Water": "Crear o destruir agua", "Create Undead": "Crear muertos vivientes", "Creation": "Creación", "Cure Wounds": "Curar heridas", "Dancing Lights": "Luces danzantes", "Darkness": "Oscuridad", "Darkvision": "Visión en la oscuridad", "Daylight": "Luz del día", "Death Ward": "Contra la muerte", "Delayed Blast Fireball": "Bola de fuego retardada", "Demiplane": "Demiplano", "Detect Evil and Good": "Detectar el mal y el bien", "Detect Magic": "Detectar magia", "Detect Poison and Disease": "Detectar veneno y enfermedades", "Detect Thoughts": "Detectar pensamientos", "Dimension Door": "Puerta dimensional", "Disguise Self": "Disfrazarse", "Disintegrate": "Desintegrar", "Dispel Evil and Good": "Disipar el mal y el bien", "Dispel Magic": "Disipar magia", "Divination": "Adivinación", "Divine Favor": "Favor divino", "Divine Word": "Palabra divina", "Dominate Beast": "Dominar bestia", "Dominate Monster": "Dominar monstruo", "Dominate Person": "Dominar persona", "Dream": "Sueño", "Druidcraft": "Druidismo", "Earthquake": "Terremoto", "Eldritch Blast": "Impacto sobrenatural", "Elemental Weapon": "Arma elemental", "Enhance Ability": "Potenciar característica", "Enlarge/Reduce": "Agrandar/Reducir", "Entangle": "Enredar", "Enthrall": "Embelesar", "Etherealness": "Etereo", "Expeditious Retreat": "Retirada expeditiva", "Eyebite": "Mal de ojo", "Fabricate": "Fabricar", "Faerie Fire": "Fuego feérico", "Faithful Hound": "Perro fiel", "Mordenkainen's Faithful Hound": "Perro fiel de Mordenkainen", "False Life": "Vida falsa", "Fear": "Miedo", "Feather Fall": "Caída de pluma", "Feeblemind": "Mente enclenque", "Find Familiar": "Encontrar familiar", "Find Steed": "Encontrar corcel", "Find Greater Steed": "Encontrar un corcel mayor", "Find the Path": "Encontrar el camino", "Find Traps": "Detectar trampas", "Finger of Death": "Dedo de la muerte", "Fire Bolt": "Descarga de fuego", "Fire Shield": "Escudo de fuego", "Fire Storm": "Tormenta de fuego", "Fireball": "Bola de fuego", "Flame Blade": "Espada de llama", "Flame Strike": "Golpe de llama", "Flaming Sphere": "Esfera de fuego", "Flesh to Stone": "Carne a piedra", "Floating Disk": "Disco flotante", "Tenser's Floating Disk": "Disco flotante de Tenser", "Fly": "Volar", "Fog Cloud": "Nube de niebla", "Forbiddance": "Prohibición", "Forcecage": "Jaula de fuerza", "Foresight": "Previsión", "Freedom of Movement": "Libertad de movimiento", "Freezing Sphere": "Esfera congelante", "Otiluke's Freezing Sphere": "Esfera congelante de Otiluke", "Gaseous Form": "Forma gaseosa", "Gate": "Portal", "Geas": "Geas", "Gentle Repose": "Reposo apacible", "Giant Insect": "Insecto gigante", "Glibness": "Labia", "Globe of Invulnerability": "Globo de invulnerabilidad", "Glyph of Warding": "Glifo de protección", "Goodberry": "Bayas beneficiosas", "Grease": "Grasa", "Greater Invisibility": "Invisibilidad superior", "Greater Restoration": "Restauración superior", "Guardian of Faith": "Guardián de la fe", "Guards and Wards": "Guardianes y barreras", "Guidance": "Guía", "Guiding Bolt": "Dardo guía", "Gust of Wind": "Ráfaga de viento", "Hallucinatory Terrain": "Terreno ilusorio", "Hallow": "Consagrar", "Harm": "Dañar", "Haste": "Prisa", "Heal": "Sanar", "Healing Word": "Palabra de curación", "Heat Metal": "Calentar metal", "Hellish Rebuke": "Réplica infernal", "Heroes' Feast": "Banquete de héroes", "Heroism": "Heroísmo", "Hideous Laughter": "Risa atroz", "Hold Monster": "Retener monstruo", "Hold Person": "Retener persona", "Holy Aura": "Aura sagrada", "Hunger of Hadar": "Hambre de Hadar", "Hunter's Mark": "Marca del cazador", "Hypnotic Pattern": "Patrón hipnótico", "Ice Storm": "Tormenta de hielo", "Identify": "Identificar", "Illusory Script": "Escritura ilusoria", "Imprisonment": "Encarcelamiento", "Incendiary Cloud": "Nube incendiaria", "Inflict Wounds": "Infligir heridas", "Insect Plague": "Plaga de insectos", "Instant Summons": "Invocación instantánea", "Invisibility": "Invisibilidad", "Irresistible Dance": "Danza irresistible", "Otto's Irresistible Dance": "Danza irresistible de Otto", "Jump": "Salto", "Knock": "Abatir cerradura", "Legend Lore": "Conocimiento legendario", "Lesser Restoration": "Restauración menor", "Levitate": "Levitar", "Light": "Luz", "Lightning Bolt": "Rayo", "Longstrider": "Paso largo", "Mage Armor": "Armadura de mago", "Mage Hand": "Mano de mago", "Magic Circle": "Círculo mágico", "Magic Jar": "Jarra mágica", "Magic Missile": "Proyectil mágico", "Magic Mouth": "Boca mágica", "Magic Weapon": "Arma mágica", "Magnificent Mansion": "Mansión magnífica", "Mordenkainen's Magnificent Mansion": "Mansión magnífica de Mordenkainen", "Major Image": "Imagen mayor", "Mass Cure Wounds": "Curar heridas en masa", "Mass Heal": "Sanar en masa", "Mass Healing Word": "Palabra de curación en masa", "Mass Suggestion": "Sugerencia en masa", "Maze": "Laberinto", "Meld into Stone": "Fusionarse con la piedra", "Mending": "Remendar", "Message": "Mensaje", "Meteor Swarm": "Enjambre de meteoros", "Mind Blank": "Mente en blanco", "Minor Illusion": "Pequeña ilusión", "Mirage Arcane": "Espejismo arcano", "Mirror Image": "Imagen reflejada", "Mislead": "Engañar", "Misty Step": "Paso brumoso", "Modify Memory": "Modificar la memoria", "Moonbeam": "Haz de luna", "Move Earth": "Mover la tierra", "Nondetection": "Indetectabilidad", "Pass without Trace": "Pasar sin dejar rastro", "Passwall": "Muro perforado", "Phantasmal Killer": "Asesino fantasmagórico", "Phantom Steed": "Corcel fantasma", "Planar Ally": "Aliado planar", "Planar Binding": "Vínculo planar", "Plane Shift": "Cambio de plano", "Plant Growth": "Crecimiento vegetal", "Poison Spray": "Rociada venenosa", "Polymorph": "Polimorfia", "Power Word Kill": "Palabra de poder: Matar", "Power Word Heal": "Palabra de poder: Curar", "Power Word Stun": "Palabra de poder: Aturdir", "Prayer of Healing": "Oración de curación", "Prestidigitation": "Prestidigitación", "Prismatic Spray": "Chorro prismático", "Prismatic Wall": "Muro prismático", "Private Sanctum": "Santuario privado", "Mordenkainen's Private Sanctum": "Santuario privado de Mordenkainen", "Produce Flame": "Producir llama", "Programmed Illusion": "Ilusión programada", "Project Image": "Proyectar imagen", "Protection from Energy": "Protección contra la energía", "Protection from Evil and Good": "Protección contra el mal y el bien", "Protection from Poison": "Protección contra el veneno", "Purify Food and Drink": "Purificar comida y bebida", "Pyrotechnics": "Pirotecnia", "Raise Dead": "Resucitar a los muertos", "Ray of Enfeeblement": "Rayo de debilitamiento", "Ray of Frost": "Rayo de escarcha", "Rary's Telepathic Bond": "Vínculo telepático de Rary", "Regenerate": "Regenerar", "Reincarnate": "Reencarnar", "Remove Curse": "Eliminar maldición", "Resilient Sphere": "Esfera resistente", "Otiluke's Resilient Sphere": "Esfera resistente de Otiluke", "Resistance": "Resistencia", "Resurrection": "Resurrección", "Reverse Gravity": "Invertir la gravedad", "Revivify": "Revivir", "Rope Trick": "Truco con cuerda", "Sacred Flame": "Llama sagrada", "Sanctuary": "Santuario", "Scorching Ray": "Rayo abrasador", "Scrying": "Escrutar", "Secret Chest": "Cofre secreto", "Leomund's Secret Chest": "Cofre secreto de Leomund", "Secure Shelter": "Refugio seguro", "See Invisibility": "Ver lo invisible", "Seeming": "Apariencia", "Sending": "Mensaje urgente", "Sequester": "Recluir", "Shape Water": "Dar forma al agua", "Shapechange": "Cambio de forma", "Shatter": "Hacer trizas", "Shield": "Escudo", "Shield of Faith": "Escudo de la fe", "Shillelagh": "Shillelagh", "Shocking Grasp": "Toque eléctrico", "Silence": "Silencio", "Silent Image": "Imagen silenciosa", "Simulacrum": "Simulacro", "Sleep": "Sueño", "Sleet Storm": "Tormenta de aguanieve", "Slow": "Lentitud", "Spare the Dying": "Salvar a los moribundos", "Speak with Animals": "Hablar con los animales", "Speak with Dead": "Hablar con los muertos", "Speak with Plants": "Hablar con las plantas", "Spider Climb": "Trepa arácnida", "Spike Growth": "Crecimiento de púas", "Spirit Guardians": "Guardianes espirituales", "Spiritual Weapon": "Arma espiritual", "Stinking Cloud": "Nube apestosa", "Stone Shape": "Dar forma a la piedra", "Stone Tell": "Hablar con la piedra", "Stoneskin": "Piel de piedra", "Storm of Vengeance": "Tormenta de venganza", "Storm Sphere": "Esfera de tormenta", "Suggestion": "Sugerencia", "Sunbeam": "Haz de sol", "Sunburst": "Estallido solar", "Symbol": "Símbolo", "Telekinesis": "Telequinesis", "Telepathy": "Telepatía", "Telepathic Bond": "Vínculo telepático", "Teleport": "Teletransporte", "Teleportation Circle": "Círculo de teletransporte", "Thaumaturgy": "Taumaturgia", "Thunderwave": "Onda de trueno", "Time Stop": "Detener el tiempo", "Tiny Servant": "Sirviente diminuto", "Tiny Hut": "Choza diminuta", "Leomund's Tiny Hut": "Choza diminuta de Leomund", "Tongues": "Lenguas", "Transport via Plants": "Transporte mediante plantas", "Tree Stride": "Paso arbóreo", "True Polymorph": "Polimorfia verdadera", "True Resurrection": "Resurrección verdadera", "True Seeing": "Ver lo verdadero", "True Strike": "Golpe verdadero", "Unseen Servant": "Sirviente invisible", "Vampiric Touch": "Toque vampírico", "Vicious Mockery": "Burla cruel", "Wall of Fire": "Muro de fuego", "Wall of Force": "Muro de fuerza", "Wall of Ice": "Muro de hielo", "Wall of Stone": "Muro de piedra", "Wall of Thorns": "Muro de espinas", "Warding Bond": "Vínculo de protección", "Water Breathing": "Respiración acuática", "Water Walk": "Caminar sobre el agua", "Web": "Telaraña", "Weird": "Atroz", "Whirlwind": "Torbellino", "Wind Walk": "Paseo del viento", "Wind Wall": "Muro de viento", "Wish": "Deseo", "Word of Recall": "Palabra de retorno", "Zone of Truth": "Zona de verdad", "Horrid Wilting": "Marchitez horrible", "Abi-Dalzim's Horrid Wilting": "Marchitez horrible de Abi-Dalzim", "Energy Drain": "Drenar energía", "Transmute Rock": "Transmutar roca", "Wrath of Nature": "Ira de la naturaleza", "Beast Sense": "Sentido bestial", "Grasping Vine": "Enredadera asfixiante", "Locate Animals or Plants": "Localizar animales o plantas", "Locate Creature": "Localizar criatura", "Locate Object": "Localizar objeto", "Aura of Life": "Aura de vida", "Aura of Purity": "Aura de pureza", "Aura of Vitality": "Aura de vitalidad"
};

/* ---------------- Traducción automática de prosa ---------------- */

let mtCache = {};
try { mtCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch { /* primera ejecución */ }
let mtDirty = false;
let cacheTimer = null;

function flushCache() {
  if (!mtDirty) return;
  fs.writeFileSync(CACHE_FILE, JSON.stringify(mtCache), "utf8");
  mtDirty = false;
}

function mtFix(text) {
  let t = String(text);
  // "Pies" siempre minúscula tras número.
  t = t.replace(/(\d+)\s*[Pp]ies/g, "$1 pies");
  return t;
}

/* Traducción por lotes: varios textos por petición unidos con un separador que
 * el motor no traduce. Pausas adaptables ante 429/5xx y disyuntor si la cuota
 * se agota (los textos restantes quedan en inglés en lugar de bloquear horas). */
const mtJobs = [];            // {text, resolve, reject}
let mtPausedUntil = 0;
let mtFailures = 0;
let mtOpen = true;
const MT_BATCH = 8;
const MT_SEP = "\n@@@\n";

async function mtRequest(texts) {
  const res = await fetch(MT_URL + encodeURIComponent(texts.join(MT_SEP)));
  if (res.status === 429 || res.status >= 500) {
    mtPausedUntil = Date.now() + Math.min(30000, 3000 * (mtFailures + 1));
    throw new Error(`HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const translated = (data[0] || []).map(seg => seg[0]).join("");
  if (!translated) throw new Error("respuesta vacía");
  const parts = translated.split(/\s*@@@\s*/);
  if (parts.length !== texts.length) throw new Error(`lote inconsistente (${parts.length} ≠ ${texts.length})`);
  return parts;
}

async function runGroup(group) {
  const texts = group.map(j => j.text);
  const fresh = texts.filter(t => !mtCache[t]);
  if (fresh.length && mtOpen) {
    for (let attempt = 1; attempt <= 4 && mtOpen; attempt++) {
      const wait = Math.max(0, mtPausedUntil - Date.now());
      if (wait) await new Promise(r => setTimeout(r, wait));
      try {
        const translated = await mtRequest(fresh);
        fresh.forEach((t, i) => { mtCache[t] = translated[i]; });
        mtDirty = true;
        mtFailures = 0;
        break;
      } catch (err) {
        mtFailures++;
        if (mtFailures >= 10) {
          mtOpen = false;
          console.warn("  MT desactivada tras fallos repetidos; el resto de textos queda en inglés.");
        }
      }
    }
  }
  group.forEach((j, i) => j.resolve(mtFix(mtCache[texts[i]] || texts[i])));
  if (mtDirty) { clearTimeout(cacheTimer); cacheTimer = setTimeout(flushCache, 1500); }
}

async function mtWorker() {
  for (let i = 0; i < mtJobs.length; i += MT_BATCH) {
    const group = mtJobs.slice(i, i + MT_BATCH);
    await runGroup(group);
    const allCached = group.every(j => mtCache[j.text]);
    if (mtOpen && !allCached) await new Promise(r => setTimeout(r, 350));
  }
}

/* Prosa → traducción automática; campos mecánicos → glosario local sin red. */
const MECH_PHRASES = [
  ["1 action or bonus action", "1 acción o acción adicional"],
  ["1 bonus action", "1 acción adicional"], ["1 reaction", "1 reacción"], ["1 action", "1 acción"],
  ["Concentration, up to 24 hours", "Concentración, hasta 24 horas"],
  ["Concentration, up to 10 minutes", "Concentración, hasta 10 minutos"],
  ["Concentration, up to 8 hours", "Concentración, hasta 8 horas"],
  ["Concentration, up to 1 hour", "Concentración, hasta 1 hora"],
  ["Concentration, up to 5 minutes", "Concentración, hasta 5 minutos"],
  ["Concentration, up to 2 minutes", "Concentración, hasta 2 minutos"],
  ["Concentration, up to 1 minute", "Concentración, hasta 1 minuto"],
  ["Instantaneous or 1 hour", "Instantánea o 1 hora"],
  ["Until dispelled or triggered", "Hasta que se disipe o se dispare"],
  ["Until dispelled", "Hasta que se disipe"],
  ["Instantaneous", "Instantánea"], ["Special", "Especial"],
  ["8 hours", "8 horas"], ["12 hours", "12 horas"], ["24 hours", "24 horas"],
  ["10 minutes", "10 minutos"], ["1 minute", "1 minuto"], ["1 hour", "1 hora"]
];
const MECH_WORDS = [
  ["Touch", "Toque"], ["Self", "Personal"], ["Sight", "Vista"], ["Unlimited", "Ilimitado"],
  ["Instantaneous", "Instantánea"], ["permanent", "permanente"], ["special", "especial"],
  ["rounds", "asaltos"], ["round", "asalto"],
  ["minutes", "minutos"], ["minute", "minuto"], ["hours", "horas"], ["hour", "hora"],
  ["days", "días"], ["day", "día"], ["years", "años"], ["year", "año"],
  ["miles", "millas"], ["mile", "milla"], ["feet", "pies"], ["foot", "pie"]
];

function translateMechanical(text) {
  let t = String(text);
  for (const [en, es] of MECH_PHRASES) t = t.split(en).join(es);
  for (const [en, es] of MECH_WORDS) t = t.replace(new RegExp("\\b" + en + "\\b", "g"), es);
  t = t.replace(/(\d+)\s*feet\b/g, "$1 pies");
  t = t.replace(/(\d+)\s*(?:\(\s*[\d+d+\- ]+\s*\)\s*)?ft\.?/g, "$1 pies");
  return t.trim();
}

function isMechanical(text) {
  return !/[a-zA-Z]/.test(text);
}

async function translateProse(text) {
  if (!text) return "";
  const raw = String(text).replace(/\r/g, "").trim();
  if (!raw) return "";
  // Duraciones, alcances y tiempos de casteo: glosario local, sin gastar cuota de MT.
  if (/^(Self|Touch|Sight|Unlimited|Special|[\d,]+ (feet|foot|miles?|ft\.?)|[-\d/]+\/[-\d/]+ (feet|ft\.?)|1 action|1 bonus action|1 reaction|Instantaneous( or [\w ]+)?|Until [\w ]+|Concentration, up to [\w ]+|[\d,]+ (minutes?|hours?|days?|rounds?|years?)( or [\w ]+)?)$/i.test(raw)) {
    return translateMechanical(raw);
  }
  if (isMechanical(raw)) return raw;
  // Se encola y el worker por lotes lo resuelve después.
  return new Promise((resolve, reject) => { mtJobs.push({ text: raw, resolve, reject }); });
}

/* ---------------- Utilidades ---------------- */

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
const translateName = (name, map) => map[name] || name;
const translateSchool = s => SCHOOLS[s] || s;
const translateType = t => TYPES[(t || "").toLowerCase()] || (t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : "Criatura");
const translateSize = s => SIZES[s] || s || "Mediano";

function translateAlignment(a) {
  if (!a) return "Cualquiera";
  const map = {
    "lawful good": "Legal bueno", "neutral good": "Neutral bueno", "chaotic good": "Caótico bueno",
    "lawful neutral": "Legal neutral", "neutral": "Neutral", "chaotic neutral": "Caótico neutral",
    "lawful evil": "Legal maligno", "neutral evil": "Neutral maligno", "chaotic evil": "Caótico maligno",
    "any alignment": "Cualquiera", "unaligned": "Sin alineamiento",
    "any chaotic alignment": "Cualquiera caótico", "any lawful alignment": "Cualquiera legal",
    "any non-good alignment": "Cualquiera no bueno", "any non-lawful alignment": "Cualquiera no legal"
  };
  const lower = String(a).toLowerCase().trim();
  if (map[lower]) return map[lower];
  let out = String(a);
  for (const [en, es] of Object.entries(map)) out = out.replace(new RegExp("\\b" + escapeRegExp(en) + "\\b", "i"), es);
  return out;
}

function parseCr(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (s.includes("/")) { const [a, b] = s.split("/").map(Number); return b ? a / b : 0; }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/* El campo speed de Open5e llega como texto u objeto {walk, fly, swim…}. */
function speedText(speed) {
  if (!speed) return "30 pies";
  if (typeof speed === "string") return translateProse(speed);
  if (typeof speed === "object") {
    const labels = { walk: "", fly: "vuelo ", swim: "nado ", climb: "escalada ", burrow: "excavación " };
    const parts = [];
    for (const key of ["walk", "fly", "swim", "climb", "burrow"]) {
      const v = speed[key];
      if (v == null || v === "") continue;
      if (typeof v === "number") parts.push(`${labels[key]}${v} pies`);
      else parts.push(labels[key] + String(v));
    }
    if (speed.hover) parts.push("levita");
    return parts.join(", ") || "30 pies";
  }
  return String(speed);
}

/* ---------------- Registros ---------------- */

function monsterRecord(m) {
  const stats = { str: Number(m.strength) || 10, dex: Number(m.dexterity) || 10, con: Number(m.constitution) || 10, int: Number(m.intelligence) || 10, wis: Number(m.wisdom) || 10, cha: Number(m.charisma) || 10 };
  const jobs = [];
  for (const ab of m.special_abilities || []) {
    jobs.push(async () => {
      const [n, d] = await Promise.all([translateProse(ab.name), translateProse(ab.desc)]);
      return `${n.replace(/\.+$/, "")}. ${d}`;
    });
  }
  const sensesJob = translateProse(m.senses || "");
  const languagesJob = translateProse(m.languages || "");
  const actionJobs = [];
  for (const a of m.actions || []) {
    actionJobs.push(async () => {
      const [n, d] = await Promise.all([translateProse(a.name), translateProse(a.desc)]);
      return `${n.replace(/\.+$/, "")}. ${d}`;
    });
  }
  for (const a of m.bonus_actions || []) {
    actionJobs.push(async () => {
      const [n, d] = await Promise.all([translateProse(a.name), translateProse(a.desc)]);
      return `${n.replace(/\.+$/, "")} (acción adicional). ${d}`;
    });
  }
  const legendaryDescJob = m.legendary_desc ? translateProse(m.legendary_desc) : Promise.resolve("");
  for (const a of m.legendary_actions || []) {
    actionJobs.push(async () => {
      const [n, d] = await Promise.all([translateProse(a.name), translateProse(a.desc)]);
      return `${n.replace(/\.+$/, "")} (legendaria). ${d}`;
    });
  }

  return (async () => {
    const [abilities, senses, languages, actions, legendaryDesc] = await Promise.all([
      Promise.all(jobs.map(j => j())), sensesJob, languagesJob, Promise.all(actionJobs.map(j => j())), legendaryDescJob
    ]);
    const metaLine = [senses && `Sentidos: ${senses}`, languages && `Idiomas: ${languages}`].filter(Boolean).join(". ");
    const hpDice = (m.hit_dice || "").trim();
    const acDesc = await translateProse(m.armor_desc || "");
    return {
      id: "srd-" + m.slug,
      name: translateName(m.name, MONSTER_NAMES),
      type: translateType(m.type),
      size: translateSize(m.size),
      ac: Number(m.armor_class) || 10,
      hp: Number(m.hit_points) || 1,
      speed: await speedText(m.speed),
      cr: parseCr(m.cr) ?? parseCr(m.challenge_rating) ?? 0,
      stats,
      abilities: [abilities.join(" "), metaLine, hpDice && `Dados de golpe: ${hpDice}`, acDesc && `Armadura: ${acDesc}`].filter(Boolean).join(" ").trim(),
      actions: [actions.join(" "), legendaryDesc && `Acciones legendarias. ${legendaryDesc}`].filter(Boolean).join(" ").trim(),
      alignment: translateAlignment(m.alignment),
      source: "srd-5.1"
    };
  })();
}

function spellRecord(s) {
  const jobs = [
    translateProse(s.casting_time || ""), translateProse(s.range || ""), translateProse(s.duration || ""), translateProse(s.desc || "")
  ];
  return (async () => {
    const [castingTime, range, duration, description] = await Promise.all(jobs);
    return {
      id: "srd-" + s.slug,
      name: translateName(s.name, SPELL_NAMES),
      level: Number(s.level_int != null ? s.level_int : (parseInt(s.level) || 0)),
      school: translateSchool(s.school),
      castingTime: castingTime || "1 acción",
      range: range || "Personal",
      components: s.components || "",
      duration: duration || "Instantánea",
      description,
      source: "srd-5.1"
    };
  })();
}

/* ---------------- Descarga con reintentos ---------------- */

async function fetchAll(endpoint) {
  const out = [];
  let url = `${API}/${endpoint}/?document__slug=${DOC}&limit=1000`;
  while (url) {
    let json = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        json = await res.json();
        break;
      } catch (err) {
        if (attempt === 4) throw err;
        console.log(`  reintento ${attempt} para ${url} (${err.message})`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    out.push(...(json.results || []));
    url = json.next;
    if (url) await new Promise(r => setTimeout(r, 400));
  }
  return out;
}

/* ---------------- SQL ---------------- */

// standard_conforming_strings=on: la comilla simple es el único escape necesario.
const sqlStr = v => `'${String(v == null ? "" : v).replace(/'/g, "''")}'`;

function insertRows(table, records, cols) {
  const chunks = [];
  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH);
    const values = slice.map(r => {
      const parts = cols.map(c => {
        const val = c === "data" ? JSON.stringify(r) : r[c];
        return c === "data" ? `${sqlStr(val)}::jsonb` : sqlStr(val);
      });
      return `  (${parts.join(", ")})`;
    }).join(",\n");
    chunks.push(`insert into public.${table} (${cols.join(", ")})\nvalues\n${values}\non conflict (slug) do nothing;`);
  }
  return chunks.join("\n\n");
}

/* ---------------- Principal ---------------- */

async function main() {
  console.log("Descargando SRD 5.1 desde Open5e (CC-BY 4.0)…");
  const [monstersRaw, spellsRaw] = await Promise.all([fetchAll("monsters"), fetchAll("spells")]);
  console.log(`Recibido: ${monstersRaw.length} monstruos, ${spellsRaw.length} hechizos.`);

  console.log("Traduciendo (glosario local para campos mecánicos; MT por lotes para la prosa)…");
  const monsterPromises = monstersRaw.map(monsterRecord);   // encola todos los textos
  const spellPromises = spellsRaw.map(spellRecord);
  await mtWorker();                                         // procesa los lotes
  const monsters = (await Promise.all(monsterPromises)).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const spells = (await Promise.all(spellPromises)).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "es"));
  flushCache();

  const missingMonsters = monstersRaw.filter(m => !MONSTER_NAMES[m.name]).map(m => m.name);
  const missingSpells = spellsRaw.filter(s => !SPELL_NAMES[s.name]).map(s => s.name);
  if (missingMonsters.length) console.log(`Monstruos sin nombre traducido (${missingMonsters.length}): ${missingMonsters.join(", ")}`);
  if (missingSpells.length) console.log(`Hechizos sin nombre traducido (${missingSpells.length}): ${missingSpells.join(", ")}`);

  const header =
    `-- Semilla del compendio SRD 5.1 en español para Grimhold.\n` +
    `-- Generado por build-srd.js a partir del SRD 5.1 de Wizards of the Coast\n` +
    `-- (Creative Commons Attribution 4.0; servido por Open5e). Ejecutar una sola\n` +
    `-- vez en el SQL Editor de Supabase, después de supabase-schema.sql.\n\n`;

  const tableSql =
    `create table if not exists public.srd_monsters (\n` +
    `  slug text primary key,\n` +
    `  name text not null,\n` +
    `  type text not null default 'Criatura',\n` +
    `  size text,\n` +
    `  ac int not null default 10,\n` +
    `  hp int not null default 1,\n` +
    `  cr numeric not null default 0,\n` +
    `  data jsonb not null,\n` +
    `  source text not null default 'srd-5.1'\n` +
    `);\n\n` +
    `create table if not exists public.srd_spells (\n` +
    `  slug text primary key,\n` +
    `  name text not null,\n` +
    `  level int not null default 0,\n` +
    `  school text not null default 'Universal',\n` +
    `  data jsonb not null,\n` +
    `  source text not null default 'srd-5.1'\n` +
    `);\n\n` +
    `alter table public.srd_monsters enable row level security;\n` +
    `alter table public.srd_spells enable row level security;\n\n` +
    `drop policy if exists "Anyone authenticated can read SRD monsters" on public.srd_monsters;\n` +
    `drop policy if exists "Anyone authenticated can read SRD spells" on public.srd_spells;\n` +
    `create policy "Anyone authenticated can read SRD monsters" on public.srd_monsters\n` +
    `  for select to authenticated using (true);\n` +
    `create policy "Anyone authenticated can read SRD spells" on public.srd_spells\n` +
    `  for select to authenticated using (true);\n\n` +
    `grant select on public.srd_monsters to authenticated;\n` +
    `grant select on public.srd_spells to authenticated;\n\n`;

  const mCols = ["slug", "name", "type", "size", "ac", "hp", "cr", "data", "source"];
  const sCols = ["slug", "name", "level", "school", "data", "source"];

  const seedSql =
    `-- El seed es idempotente: limpia y recarga el compendio completo.\n` +
    `truncate public.srd_monsters;\n` +
    `truncate public.srd_spells;\n\n` +
    insertRows("srd_monsters", monsters, mCols) + "\n\n" +
    insertRows("srd_spells", spells, sCols) + "\n";

  fs.writeFileSync("supabase-seed-srd.sql", header + tableSql + seedSql, "utf8");

  console.log("\nMuestra monstruo:", JSON.stringify(monsters.find(m => m.id === "srd-goblin") || monsters[0], null, 1).slice(0, 900));
  console.log("\nMuestra hechizo:", JSON.stringify(spells.find(s => s.id === "srd-fireball") || spells[0], null, 1).slice(0, 900));
  console.log(`\nOK → supabase-seed-srd.sql (${monsters.length} monstruos, ${spells.length} hechizos).`);
}

main().catch(err => { console.error(err); process.exit(1); });
