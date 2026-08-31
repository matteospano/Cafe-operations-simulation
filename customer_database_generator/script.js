/* =========================================================
   CUSTOMER DATABASE GENERATOR
========================================================= */


/* =========================================================
   DOM
========================================================= */

const customerCountInput =
  document.getElementById(
    "customerCount"
  );

const seedInput =
  document.getElementById(
    "seed"
  );

const namesInput =
  document.getElementById(
    "namesInput"
  );

const surnamesInput =
  document.getElementById(
    "surnamesInput"
  );

const output =
  document.getElementById(
    "output"
  );

const generateBtn =
  document.getElementById(
    "generateBtn"
  );

const copyBtn =
  document.getElementById(
    "copyBtn"
  );


/* =========================================================
   CONSTANT DATA
========================================================= */


/*
  Product IDs are the same as in Café Sim.

  1 = coffee
  2 = sandwich
  3 = cocktail
  4 = cupcake
*/

const PRODUCTS = {

  1: {
    name: "coffee"
  },

  2: {
    name: "sandwich"
  },

  3: {
    name: "cocktail"
  },

  4: {
    name: "cupcake"
  }

};


/*
  All classes are data.

  The generator does not care what
  "Student" or "Banker" means.
*/

const CLASSES = {

  1: {

    id: 1,

    name: "Student",

    frequency: 0.35,

    nameStyle: 1,

    age: [18, 28],

    patience: [75, 100],

    tip: [4, 9],

    likes: {
      1: 0.90,
      2: 0.10,
      3: 0.05,
      4: 0.45
    },

    secondOrderChance: 0.60,

    secondOrderProduct: 1

  },


  2: {

    id: 2,

    name: "Banker",

    frequency: 0.20,

    nameStyle: 2,

    age: [35, 65],

    patience: [50, 80],

    tip: [10, 20],

    likes: {
      1: 0.75,
      2: 0.10,
      3: 0.75,
      4: 0.20
    },

    secondOrderChance: 0.40,

    secondOrderProduct: 3

  },


  3: {

    id: 3,

    name: "Commuter",

    frequency: 0.25,

    nameStyle: 2,

    age: [25, 60],

    patience: [20, 45],

    tip: [4, 16],

    likes: {
      1: 0.95,
      2: 0.25,
      3: 0.05,
      4: 0.05
    },

    secondOrderChance: 0,

    secondOrderProduct: 1

  },


  4: {

    id: 4,

    name: "Freelancer",

    frequency: 0.10,

    nameStyle: 1,

    age: [25, 45],

    patience: [55, 95],

    tip: [7, 15],

    likes: {
      1: 0.80,
      2: 0.35,
      3: 0.25,
      4: 0.60
    },

    secondOrderChance: 0.50,

    secondOrderProduct: 1

  },


  5: {

    id: 5,

    name: "Retiree",

    frequency: 0.07,

    nameStyle: 1,

    age: [60, 85],

    patience: [80, 100],

    tip: [5, 12],

    likes: {
      1: 0.85,
      2: 0.20,
      3: 0.15,
      4: 0.40
    },

    secondOrderChance: 0.35,

    secondOrderProduct: 1

  },


  6: {

    id: 6,

    name: "Tourist",

    frequency: 0.03,

    nameStyle: 1,

    age: [20, 65],

    patience: [40, 80],

    tip: [8, 25],

    likes: {
      1: 0.60,
      2: 0.35,
      3: 0.55,
      4: 0.30
    },

    secondOrderChance: 0.30,

    secondOrderProduct: 3

  }

};


/*
  Global game configuration.

  These are generated into the JSON
  because the game also needs them.
*/

const GAME_CONFIG = {

  openingTime: "08:00",

  closingTime: "18:00",

  arrivalShift: 30,

  maxSeats: 5,

  startMoney: 100,

  cupcakesPerDay: 5,

  cupcakeCost: 1,

  cupcakeProductId: 4,

  dailyBills: 25,

  monthlyRent: 500,

  daysPerMonth: 30,

  maxOrders: 2,

  secondOrderMinSatisfaction: 50

};


/* =========================================================
   RANDOM GENERATOR
========================================================= */


/*
  Simple seeded random generator.

  Same seed → same database.
*/

function createRandom(seed) {

  if (
    !seed
  ) {

    return Math.random;

  }


  let hash = 0;


  for (
    let i = 0;
    i < seed.length;
    i++
  ) {

    hash =
      (
        (
          hash << 5
        ) -
        hash
      ) +
      seed.charCodeAt(i);

    hash |= 0;

  }


  let value =
    Math.abs(hash) + 1;


  return function () {

    value =
      (
        value * 16807
      ) %
      2147483647;


    return (
      value - 1
    ) /
    2147483646;

  };

}


function randomInt(
  random,
  min,
  max
) {

  return Math.floor(
    random() *
    (max - min + 1)
  ) + min;

}


function randomChoice(
  random,
  array
) {

  return array[
    randomInt(
      random,
      0,
      array.length - 1
    )
  ];

}


function weightedChoice(
  random,
  weights
) {

  const entries =
    Object.entries(
      weights
    );


  const total =
    entries.reduce(
      (
        sum,
        [, weight]
      ) =>
        sum +
        weight,
      0
    );


  let value =
    random() *
    total;


  for (
    const [
      key,
      weight
    ]
    of entries
  ) {

    value -=
      weight;


    if (
      value <= 0
    ) {

      return Number(key);

    }

  }


  return Number(
    entries[
      entries.length - 1
    ][0]
  );

}


/* =========================================================
   INPUT PARSING
========================================================= */

function parseList(
  value
) {

  return value
    .split(",")
    .map(
      item =>
        item.trim()
    )
    .filter(
      Boolean
    );

}


function parsePeakWindows(
  input
) {

  const result = {};


  input
    .split(",")
    .map(
      value =>
        value.trim()
    )
    .filter(
      Boolean
    )
    .forEach(
      range => {

        const [
          start,
          end
        ] =
          range.split("-");


        if (
          !start ||
          !end
        ) {

          return;

        }


        result.push({

          start:
            start.trim(),

          end:
            end.trim()

        });

      }
    );


  return result;

}


/* =========================================================
   GENERATE ETA
========================================================= */

function generateETA(
  random,
  peakHours,
  classData
) {

  const eta = [];


  for (
    let day = 1;
    day <= 7;
    day++
  ) {

    const windows =
      peakHours[day] || [];


    if (
      windows.length === 0
    ) {

      continue;

    }


    /*
      Class frequency is interpreted
      as probability of visiting
      on an available day.
    */

    if (
      random() >
      classData.frequency
    ) {

      continue;

    }


    const selectedWindow =
      randomChoice(
        random,
        windows
      );


    const start =
      timeToMinutes(
        selectedWindow.start
      );


    const end =
      timeToMinutes(
        selectedWindow.end
      );


    const minute =
      randomInt(
        random,
        start,
        Math.max(
          start,
          end - 1
        )
      );


    eta.push({

      day,

      time:
        minutesToTime(
          minute
        )

    });

  }


  /*
    Every generated customer should
    have at least one visit.
  */

  if (
    eta.length === 0
  ) {

    const availableDays =
      Object.keys(
        peakHours
      )
      .filter(
        day =>
          peakHours[day]?.length
      );


    if (
      availableDays.length
    ) {

      const day =
        Number(
          randomChoice(
            random,
            availableDays
          )
        );


      const windows =
        peakHours[day];


      const selectedWindow =
        randomChoice(
          random,
          windows
        );


      const start =
        timeToMinutes(
          selectedWindow.start
        );


      const end =
        timeToMinutes(
          selectedWindow.end
        );


      eta.push({

        day,

        time:
          minutesToTime(
            randomInt(
              random,
              start,
              Math.max(
                start,
                end - 1
              )
            )
          )

      });

    }

  }


  return eta;

}


/* =========================================================
   TIME HELPERS
========================================================= */

function timeToMinutes(
  value
) {

  const [
    hours,
    minutes
  ] =
    value
      .split(":")
      .map(Number);


  return (
    hours * 60 +
    minutes
  );

}


function minutesToTime(
  value
) {

  const hours =
    Math.floor(
      value / 60
    );


  const minutes =
    value % 60;


  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}`
  );

}


/* =========================================================
   GENERATE CUSTOMER
========================================================= */

function generateCustomer(
  random,
  index,
  names,
  surnames,
  peakHours
) {

  const classId =
    weightedChoice(
      random,
      getClassWeights()
    );


  const classData =
    CLASSES[classId];


  const firstName =
    randomChoice(
      random,
      names
    );


  const surname =
    randomChoice(
      random,
      surnames
    );


  const age =
    randomInt(
      random,
      classData.age[0],
      classData.age[1]
    );


  const patience =
    randomInt(
      random,
      classData.patience[0],
      classData.patience[1]
    );


  const tip =
    randomInt(
      random,
      classData.tip[0],
      classData.tip[1]
    );


  const likes = [];


  for (
    const productId
    of Object.keys(
      classData.likes
    )
  ) {

    if (
      random() <
      classData.likes[productId]
    ) {

      likes.push(
        Number(productId)
      );

    }

  }


  /*
    Guarantee at least one liked item.
  */

  if (
    likes.length === 0
  ) {

    likes.push(
      weightedChoice(
        random,
        classData.likes
      )
    );

  }


  /*
    The customer database itself
    contains only the customer's data.

    The class ID refers to the class
    definitions in the same JSON.
  */

  return {

    id:
      `customer_${String(
        index + 1
      ).padStart(3, "0")}`,

    name:
      firstName,

    surname:
      surname,

    classId:
      classId,

    age:
      age,

    likes:
      likes,

    patience:
      patience,

    tip:
      tip,

    eta:
      generateETA(
        random,
        peakHours,
        classData
      ),

    info:
      generateInfo(
        random,
        classData,
        firstName,
        age
      )

  };

}


/* =========================================================
   CLASS WEIGHTS
========================================================= */

function getClassWeights() {

  const weights = {};


  for (
    const classId
    of Object.keys(CLASSES)
  ) {

    weights[
      classId
    ] =
      CLASSES[
        classId
      ].frequency;

  }


  return weights;

}


/* =========================================================
   GENERATED PERSONAL INFO
========================================================= */

function generateInfo(
  random,
  classData,
  firstName,
  age
) {

  const templates = {

    1: [
      "Studies and often stays at the counter.",
      "Usually comes here after classes.",
      "Likes having a quiet place to study."
    ],

    2: [
      "Works in finance and often takes a short break here.",
      "Knows many people in the neighborhood.",
      "Often comes here after work."
    ],

    3: [
      "Works outside the city and is usually in a hurry.",
      "Usually stops here on the way to work.",
      "Has very little free time in the morning."
    ],

    4: [
      "Works independently and often uses the cafe as an office.",
      "Likes working with a coffee nearby.",
      "Often spends several hours working here."
    ],

    5: [
      "Likes quiet mornings.",
      "Often comes here to read the newspaper.",
      "Enjoys chatting with familiar people."
    ],

    6: [
      "Is visiting the city for a few days.",
      "Likes discovering local cafes.",
      "Usually explores the city during the day."
    ]

  };


  const options =
    templates[
      classData.id
    ] ||
    [
      "Seems to enjoy spending time here."
    ];


  return randomChoice(
    random,
    options
  );

}


/* =========================================================
   GENERATE DATABASE
========================================================= */

function generateDatabase() {

  const count =
    Math.max(
      1,
      Math.min(
        1000,
        Number(
          customerCountInput.value
        )
      )
    );


  const names =
    parseList(
      namesInput.value
    );


  const surnames =
    parseList(
      surnamesInput.value
    );


  if (
    names.length === 0 ||
    surnames.length === 0
  ) {

    alert(
      "Please provide at least one first name and one surname."
    );

    return;

  }


  /*
    Peak hours.
  */

  const peakHours = {};


  document
    .querySelectorAll(
      ".peak"
    )
    .forEach(
      input => {

        const day =
          Number(
            input.dataset.day
          );


        const ranges =
          input.value
            .split(",")
            .map(
              value =>
                value.trim()
            )
            .filter(
              Boolean
            );


        peakHours[day] =
          ranges
            .map(
              range => {

                const [
                  start,
                  end
                ] =
                  range.split("-");


                if (
                  !start ||
                  !end
                ) {

                  return null;

                }


                return {

                  start:
                    normalizeTime(
                      start
                    ),

                  end:
                    normalizeTime(
                      end
                    )

                };

              }
            )
            .filter(
              Boolean
            );

      }
    );


  /*
    Seed.

    Empty = new random database.
  */

  const seed =
    seedInput.value.trim();


  const random =
    createRandom(
      seed
    );


  /*
    Class definitions go into the
    resulting JSON too.
  */

  const generatedCustomers = [];


  for (
    let i = 0;
    i < count;
    i++
  ) {

    generatedCustomers.push(
      generateCustomer(
        random,
        i,
        names,
        surnames,
        peakHours
      )
    );

  }


  /*
    Final JSON structure.

    full form:
      const result = {

    config:      GAME_CONFIG,

    products:      PRODUCTS,

    classes:      CLASSES,

    customers:      generatedCustomers
  };
  */

  output.value =
    JSON.stringify(
      generatedCustomers, //or result for the full form
      null,
      2
    );

}


/* =========================================================
   NORMALIZE TIME
========================================================= */

function normalizeTime(
  value
) {

  const clean =
    value.trim();


  /*
    Support:

    8
    08
    8:30
    08:30
  */

  if (
    !clean.includes(":")
  ) {

    return (
      `${String(
        Number(clean)
      ).padStart(2, "0")}:00`
    );

  }


  const [
    hours,
    minutes
  ] =
    clean
      .split(":")
      .map(Number);


  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}`
  );

}

/* =========================================================
   COPY JSON
========================================================= */

async function copyJSON() {

  if (
    !output.value
  ) {

    return;

  }


  try {

    await navigator.clipboard.writeText(
      output.value
    );


    copyBtn.textContent =
      "Copied!";


    setTimeout(
      () => {

        copyBtn.textContent =
          "Copy JSON";

      },
      1200
    );

  }

  catch (error) {

    console.error(
      error
    );


    output.select();

    document.execCommand(
      "copy"
    );

  }

}


/* =========================================================
   EVENTS
========================================================= */

generateBtn.addEventListener(
  "click",
  generateDatabase
);


copyBtn.addEventListener(
  "click",
  copyJSON
);


/* =========================================================
   INITIAL GENERATION
========================================================= */

generateDatabase();
