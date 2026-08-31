/* =========================================================
   CAFE SIM 1.7
========================================================= */


/* =========================================================
   DOM
========================================================= */

const dayEl = document.getElementById("dayLabel");
const timeEl = document.getElementById("timeLabel");
const moneyEl = document.getElementById("moneyLabel");
const rentEl = document.getElementById("rentLabel");
const rentProgress = document.getElementById("rentProgress");
const slotsEl = document.getElementById("customerSlots");
const actionsEl = document.getElementById("actions");
const statusEl = document.getElementById("currentActionText");
const infoBtn = document.getElementById("infoBtn");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalActions = document.getElementById("modalActions");
const modalClose = document.getElementById("modalClose");
const endDayBtn = document.getElementById("endDayBtn");
const waitBtn = document.getElementById("debug30Btn");
const cupcakeLabel = document.getElementById("cupcakeLabel");


/* =========================================================
   DATA
========================================================= */

let data = null;
let customers = [];
let rentSaved = 0;


/* =========================================================
   GAME STATE
========================================================= */

function createEmptyGame() {
  return {
    started: false,
    gameOver: false,
    day: 1,
    minutes: 0,
    money: 0,
    dailyIncome: 0,
    cupcakes: 0,
    slots: [],
    schedule: [],
    friendship: {},
    selectedCustomerId: null,
    preparationTask: null,
    conversationTask: null,
    cleaningTask: null
  };
}

let game = createEmptyGame();


/* =========================================================
   HELPERS
========================================================= */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value) {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCustomer(id) {
  return customers.find(customer => customer.id === id) || null;
}

function getProduct(id) {
  return data.products[String(id)] || null;
}

function getClass(id) {
  return data.classes[String(id)] || null;
}

function getSlot(customerId) {
  return game.slots.find(slot => slot && !slot.dirty && slot.customerId === customerId) || null;
}

function getSlotIndex(customerId) {
  return game.slots.findIndex(slot => slot && !slot.dirty && slot.customerId === customerId);
}

function getSeatLetter(index) {
  return String.fromCharCode(65 + index);
}

function getWeekday(day) {
  return ((day - 1) % 7) + 1;
}

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}


/* =========================================================
   LOAD
========================================================= */

async function loadGameData() {
  try {
    const response = await fetch("./customers.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    data = await response.json();
    customers = Array.isArray(data.customers) ? data.customers : [];

    validateData();

    game = createEmptyGame();
    updateUI();
    setStatus(data.texts.startPrompt);
  } catch (error) {
    console.error(error);
    setStatus("Could not load customers.json.");
  }
}

function validateData() {
  const required = ["config", "products", "actions", "classes", "friendship", "nameStyles", "ageGroups", "patienceLevels", "tipLevels", "texts"];

  for (const key of required) {
    if (!data[key]) throw new Error(`customers.json is missing "${key}".`);
  }
}


/* =========================================================
   START / DAY
========================================================= */

function startGame() {
  rentSaved = 0;

  game = createEmptyGame();
  game.started = true;
  game.day = 1;
  game.minutes = timeToMinutes(data.config.openingTime);
  game.money = data.config.startMoney;
  game.cupcakes = data.config.cupcakesPerDay;
  game.slots = Array(data.config.maxSeats).fill(null);

  startDay();
}

function startDay() {
  if (game.day > data.config.daysPerMonth) {
    endGame(data.texts.monthOver);
    return;
  }

  game.minutes = timeToMinutes(data.config.openingTime);
  game.dailyIncome = 0;
  game.cupcakes = data.config.cupcakesPerDay;
  game.slots = Array(data.config.maxSeats).fill(null);
  game.selectedCustomerId = null;
  game.preparationTask = null;
  game.conversationTask = null;
  game.cleaningTask = null;

  buildSchedule();
  processArrivals();

  setStatus(data.texts.dayStarted.replace("{day}", game.day));
  updateUI();
}


/* =========================================================
   SCHEDULE
========================================================= */

function buildSchedule() {
  const schedule = [];
  const weekday = getWeekday(game.day);

  for (const customer of customers) {
    const appointments = Array.isArray(customer.eta) ? customer.eta : [];

    for (const appointment of appointments) {
      if (Number(appointment.day) !== weekday) continue;

      const baseTime = timeToMinutes(appointment.time);
      const shift = randomInt(-data.config.arrivalShift, data.config.arrivalShift);
      const arrivalTime = clamp(
        baseTime + shift,
        timeToMinutes(data.config.openingTime),
        timeToMinutes(data.config.closingTime)
      );

      schedule.push({ customerId: customer.id, arrivalTime, arrived: false });
    }
  }

  schedule.sort((a, b) => a.arrivalTime - b.arrivalTime);
  game.schedule = schedule;
}


/* =========================================================
   NICKNAME / FRIENDSHIP
========================================================= */

function getFriendshipLevel(customerId) {
  const value = game.friendship[customerId] || 0;
  return Math.min(data.friendship.maxLevel, Math.floor(value / 10));
}

function getInitialNickname(customer) {
  const classData = getClass(customer.classId);

  if (classData.nameStyle === data.nameStyles.formal) {
    return `${data.nameStyles.formalPrefix} ${customer.surname}`;
  }

  return `Customer`;
}

function updateNickname(slot) {
  if (!slot || !slot.customerId) return;

  const customer = getCustomer(slot.customerId);
  if (!customer) return;

  const level = getFriendshipLevel(customer.id);
  const classData = getClass(customer.classId);

  if (level < data.friendship.name) {
    const index = getSlotIndex(customer.id);
    slot.nickname = index >= 0 ? `Customer ${index + 1}` : "Customer";
    return;
  }

  if (classData.nameStyle === data.nameStyles.friendly) {
    slot.nickname = level < data.friendship.surname ? customer.name : `${customer.name} ${customer.surname}`;
    return;
  }

  slot.nickname = level < data.friendship.surname
    ? `${data.nameStyles.formalPrefix} ${customer.surname}`
    : `${customer.name} ${customer.surname}`;
}

function addFriendship(customerId, amount) {
  const oldValue = game.friendship[customerId] || 0;
  const oldLevel = getFriendshipLevel(customerId);
  const newValue = clamp(oldValue + amount, 0, 100);
  const newLevel = Math.min(data.friendship.maxLevel, Math.floor(newValue / 10));

  game.friendship[customerId] = newValue;

  if (oldLevel !== newLevel) {
    const slot = getSlot(customerId);
    if (slot) updateNickname(slot);
  }
}


/* =========================================================
   CUSTOMER INFO
========================================================= */

function getAgeGroup(age) {
  if (age <= data.ageGroups.young.max) return data.ageGroups.young.label;
  if (age <= data.ageGroups.adult.max) return data.ageGroups.adult.label;
  return data.ageGroups.elderly.label;
}

function getPatienceLabel(value) {
  for (const level of data.patienceLevels) {
    if (value <= level.max) return level.label;
  }
  return data.patienceLevels.at(-1).label;
}

function getTipLabel(value) {
  for (const level of data.tipLevels) {
    if (value <= level.max) return level.label;
  }
  return data.tipLevels.at(-1).label;
}

function getLikesText(customer, level) {
  const likes = Array.isArray(customer.likes) ? customer.likes : [];

  if (level < data.friendship.likes) return "likes: ??? · ???";

  if (level < data.friendship.fullLikes) {
    const first = likes.length ? getProduct(likes[0])?.name : "???";
    return `likes: ${first} · ???`;
  }

  if (!likes.length) return "likes: none";

  return `likes: ${likes.map(id => getProduct(id)?.name).filter(Boolean).join(", ")}`;
}


/* =========================================================
   TALKING
========================================================= */

function isTalkingTo(customerId) {
  return Boolean(
    game.conversationTask &&
    game.conversationTask.customerIds.includes(customerId)
  );
}

function startConversation(customerIds, duration) {
  if (game.conversationTask) return;

  const validIds = customerIds.filter(id => {
    const slot = getSlot(id);
    return slot && !slot.dirty;
  });

  if (!validIds.length) return;

  game.conversationTask = {
    customerIds: validIds,
    duration,
    remaining: duration
  };

  if (validIds.length === 1) {
    const slot = getSlot(validIds[0]);
    setStatus(`Talking to ${slot.nickname}...`);
  } else {
    setStatus("Talking to the table...");
  }

  updateUI();
}

function startTableConversation() {
  const ids = game.slots
    .filter(slot => slot && !slot.dirty)
    .map(slot => slot.customerId);

  if (ids.length < 2) return;

  startConversation(ids, data.actions.tableChat.time);
}

function completeConversation() {
  if (!game.conversationTask) return;

  const task = game.conversationTask;
  game.conversationTask = null;

  const isGroup = task.customerIds.length > 1;

  for (const customerId of task.customerIds) {
    const slot = getSlot(customerId);
    const customer = getCustomer(customerId);

    if (!slot || !customer) continue;

    const classData = getClass(customer.classId);
    const friendshipGain = isGroup ? randomInt(2, 5) : randomInt(5, 8);
    const chatBonus = isGroup ? Number(classData.group_chat_bonus) || 0 : Number(classData.single_chat_bonus) || 0;

    addFriendship(customerId, friendshipGain);

    slot.chatBonus = (slot.chatBonus || 0) + chatBonus;

    slot.satisfaction = clamp(
      slot.satisfaction + 5,
      0,
      100
    );
  }

  /*
    If the customer already had exactly one served
    product and explicitly decided not to order again,
    they leave after the conversation.

    This is intentionally a very simple rule:
    conversation does not create an infinite stay.
  */

  for (const customerId of task.customerIds) {
    const slot = getSlot(customerId);

    if (
      slot &&
      slot.servedProducts.length === 1 &&
      !slot.secondOrderRequested
    ) {
      if (Math.random() < 0.85) leaveCustomer(customerId);
    }
  }

  /*
    Second order is definitive.
    Once both products have been served,
    conversation is the only thing that can
    delay the customer's departure.
  */

  for (const customerId of task.customerIds) {
    const slot = getSlot(customerId);

    if (
      slot &&
      slot.servedProducts.length >= data.config.maxOrders
    ) {
      leaveCustomer(customerId);
    }
  }

  setStatus(
    isGroup
      ? "Table conversation finished."
      : "Conversation finished."
  );

  updateUI();
}


/* =========================================================
   ARRIVALS
========================================================= */

function processArrivals() {
  const events = game.schedule
    .filter(event => !event.arrived && event.arrivalTime <= game.minutes)
    .sort((a, b) => a.arrivalTime - b.arrivalTime);

  for (const event of events) {
    const seatIndex = game.slots.findIndex(slot => slot === null);

    if (seatIndex === -1) {
      event.arrivalTime = game.minutes + 5;
      continue;
    }

    const customer = getCustomer(event.customerId);

    if (!customer) {
      event.arrived = true;
      continue;
    }

    event.arrived = true;

    if (game.friendship[customer.id] === undefined) {
      game.friendship[customer.id] = 0;
    }

    const slot = {
      customerId: customer.id,
      nickname: `Customer ${seatIndex + 1}`,
      arrivalTime: event.arrivalTime,
      waiting: 0,
      pendingProduct: null,
      servedProducts: [],
      secondOrderRequested: false,
      satisfaction: 50,
      chatBonus: 0,
      cupcakeGiven: false,
      dirty: false,
      tipCollected: false
    };

    game.slots[seatIndex] = slot;
    updateNickname(slot);

    setStatus(`${slot.nickname} arrived at the café.`);
  }
}


/* =========================================================
   ORDERING
========================================================= */

function chooseFirstOrder(customer) {
  const productIds = Object.keys(data.products)
    .map(Number)
    .filter(id => id !== data.config.cupcakeProductId);

  const weighted = [];

  for (const productId of productIds) {
    if (customer.likes?.includes(productId)) {
      weighted.push(productId, productId, productId, productId);
    } else {
      weighted.push(productId);
    }
  }

  return weighted[randomInt(0, weighted.length - 1)];
}

function canTakeOrder(slot) {
  if (!slot || slot.dirty) return false;
  if (slot.pendingProduct !== null) return false;
  if (slot.servedProducts.length >= data.config.maxOrders) return false;
  if (slot.servedProducts.length === 0) return true;
  return slot.secondOrderRequested;
}

function takeOrder(customerId) {
  const slot = getSlot(customerId);
  if (!canTakeOrder(slot)) return;

  const customer = getCustomer(customerId);
  let productId;

  if (slot.servedProducts.length === 0) {
    productId = chooseFirstOrder(customer);
  } else {
    const classData = getClass(customer.classId);
    productId = classData.secondOrderProduct;
  }

  if (!getProduct(productId)) {
    console.error("Invalid product:", productId);
    return;
  }

  slot.pendingProduct = productId;
  slot.secondOrderRequested = false;

  setStatus(
    `${slot.nickname} ordered ${getProduct(productId).name}.`
  );

  updateUI();
}

function evaluateSecondOrder(slot) {
  if (
    !slot ||
    slot.dirty ||
    slot.pendingProduct !== null ||
    slot.servedProducts.length !== 1 ||
    slot.secondOrderRequested
  ) return;

  if (isTalkingTo(slot.customerId)) return;

  const customer = getCustomer(slot.customerId);
  const classData = getClass(customer.classId);

  if (Math.random() < classData.secondOrderChance) {
    slot.secondOrderRequested = true;
    setStatus(`${slot.nickname} would like another order.`);
  } else {
    leaveCustomer(slot.customerId);
  }

  updateUI();
}


/* =========================================================
   PREPARATION
========================================================= */

function startPreparation(customerId) {
  if (game.preparationTask) return;

  const slot = getSlot(customerId);

  if (!slot || slot.pendingProduct === null) return;

  const product = getProduct(slot.pendingProduct);

  if (!product) return;

  game.preparationTask = {
    customerId,
    productId: product.id,
    remaining: product.prepTime,
    total: product.prepTime
  };

  setStatus(
    `Making ${slot.nickname}'s ${product.name}...`
  );

  updateUI();
}

function completePreparation() {
  if (!game.preparationTask) return;

  const task = game.preparationTask;
  game.preparationTask = null;

  const slot = getSlot(task.customerId);

  if (!slot) {
    updateUI();
    return;
  }

  const customer = getCustomer(task.customerId);
  const product = getProduct(task.productId);

  if (!customer || !product) {
    updateUI();
    return;
  }

  if (slot.servedProducts.length >= data.config.maxOrders) {
    updateUI();
    return;
  }

  slot.servedProducts.push(product.id);
  slot.pendingProduct = null;

  const waiting = Math.max(
    0,
    game.minutes - slot.arrivalTime
  );

  slot.waiting = waiting;

  const classData = getClass(customer.classId);

  /*
    Fix:
    use customer.classId, not slot.classId.
  */

  const servedInTimeBonus =
    Number(classData?.served_in_time) || 0;

  if (waiting <= customer.patience) {
    slot.satisfaction += servedInTimeBonus;
  } else {
    slot.satisfaction -= Math.min(
      40,
      Math.floor(
        (waiting - customer.patience) / 2
      )
    );
  }

  slot.satisfaction = clamp(
    slot.satisfaction,
    0,
    100
  );

  game.money += product.price;
  game.dailyIncome += product.price;

  /*
    SECOND PRODUCT:
    customer is finished.

    If talking, they leave when the
    conversation ends.
    Otherwise they leave now.
  */

  if (
    slot.servedProducts.length >= data.config.maxOrders
  ) {
    if (!isTalkingTo(slot.customerId)) {
      leaveCustomer(slot.customerId);
      return;
    }

    setStatus(
      `${slot.nickname} received their ${product.name}.`
    );

    updateUI();
    return;
  }

  /*
    FIRST PRODUCT:
    decide immediately whether the customer
    wants another product or leaves.
  */

  evaluateSecondOrder(slot);

  const current = getSlot(task.customerId);

  if (!current) return;

  setStatus(
    `${current.nickname} received their ${product.name}.`
  );

  updateUI();
}


/* =========================================================
   CUPCAKE
========================================================= */

function giveCupcake(customerId) {
  if (game.cupcakes <= 0) return;

  if (game.money < data.config.cupcakeCost) {
    setStatus("You cannot afford another cupcake.");
    return;
  }

  const slot = getSlot(customerId);

  if (!slot || slot.cupcakeGiven) return;

  const customer = getCustomer(customerId);

  game.money -= data.config.cupcakeCost;
  game.cupcakes--;
  slot.cupcakeGiven = true;

  const cupcakeBonus =
    Number(data.config.cupcakeSatisfaction) || 0;

  if (
    customer.likes?.includes(
      data.config.cupcakeProductId
    )
  ) {
    addFriendship(customerId, 7);

    slot.satisfaction = clamp(
      slot.satisfaction + cupcakeBonus,
      0,
      100
    );

    setStatus(
      `${slot.nickname} liked the cupcake.`
    );
  } else {
    addFriendship(customerId, 1);

    setStatus(
      `${slot.nickname} was not very interested in the cupcake.`
    );
  }

  updateUI();
}


/* =========================================================
   LEAVING / TIPS
========================================================= */

function leaveCustomer(customerId) {
  const index = getSlotIndex(customerId);

  if (index === -1) return;

  const slot = game.slots[index];
  const nickname = slot.nickname;
  const customer = getCustomer(customerId);

  collectTip(slot, customer);

  game.slots[index] = {
    customerId: null,
    dirty: true,
    previousCustomerId: customerId,
    previousNickname: nickname
  };

  if (game.selectedCustomerId === customerId) {
    game.selectedCustomerId = null;
  }

  setStatus(`${nickname} left the café.`);
  updateUI();
}

function forceCustomerToLeave(customerId) {
  const slot = getSlot(customerId);

  if (!slot) return;

  addFriendship(customerId, -10);
  leaveCustomer(customerId);
}

function calculateTip(slot, customer) {
  if (
    !slot ||
    !customer ||
    slot.servedProducts.length === 0
  ) return 0;

  const satisfaction =
    clamp(
      Number(slot.satisfaction) || 0,
      0,
      100
    );

  const friendship =
    Number(
      game.friendship[customer.id]
    ) || 0;

  /*
    Base tip.
  */

  const baseTip =
    Number(customer.tip) || 0;

  /*
    Satisfaction.
  */

  const satisfactionMultiplier =
    satisfaction / 100;

  /*
    Friendship.
  */

  const friendshipMultiplier =
    0.5 + friendship / 200;

  /*
    Chat.

    10 = +10%
    20 = +20%
    -1 = -1%
  */

  const chatMultiplier =
    1 + clamp(
      Number(slot.chatBonus) || 0,
      -50,
      100
    ) / 100;

  return Math.max(
    0,
    Math.round(
      baseTip *
      satisfactionMultiplier *
      friendshipMultiplier *
      chatMultiplier
    )
  );
}

function collectTip(slot, customer) {
  if (
    slot.tipCollected
  ) return 0;

  const tip =
    calculateTip(
      slot,
      customer
    );

  slot.tipCollected = true;

  game.money += tip;
  game.dailyIncome += tip;

  return tip;
}


/* =========================================================
   WAITING
========================================================= */

function updateWaitingCustomers() {
  const impatient = [];

  for (const slot of game.slots) {
    if (
      !slot ||
      slot.dirty ||
      slot.pendingProduct === null
    ) continue;

    if (isTalkingTo(slot.customerId)) continue;

    slot.waiting = Math.max(
      0,
      game.minutes - slot.arrivalTime
    );

    const customer = getCustomer(slot.customerId);

    if (
      slot.waiting >
      customer.patience
    ) {
      impatient.push(slot.customerId);
    }
  }

  for (const customerId of impatient) {
    forceCustomerToLeave(customerId);
  }
}


/* =========================================================
   TIME
========================================================= */

function advanceTime(minutes) {
  if (
    !game.started ||
    game.gameOver
  ) return;

  const duration = Number(minutes);

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) return;

  if (game.preparationTask) {
    game.preparationTask.remaining -= duration;
  }

  if (game.conversationTask) {
    game.conversationTask.remaining -= duration;
  }

  if (game.cleaningTask) {
    game.cleaningTask.remaining -= duration;
  }

  game.minutes += duration;

  processArrivals();
  updateWaitingCustomers();

  if (
    game.preparationTask &&
    game.preparationTask.remaining <= 0
  ) {
    completePreparation();
  }

  if (
    game.conversationTask &&
    game.conversationTask.remaining <= 0
  ) {
    completeConversation();
  }

  if (
    game.cleaningTask &&
    game.cleaningTask.remaining <= 0
  ) {
    completeCleaning();
  }

  processArrivals();

  updateUI();

  if (
    game.minutes >=
    timeToMinutes(
      data.config.closingTime
    )
  ) {
    endDay();
  }
}


/* =========================================================
   WAIT
========================================================= */

function getShortestRemainingAction() {
  const tasks = [];

  if (
    game.preparationTask &&
    Number.isFinite(
      game.preparationTask.remaining
    ) &&
    game.preparationTask.remaining > 0
  ) {
    tasks.push(
      game.preparationTask.remaining
    );
  }

  if (
    game.conversationTask &&
    Number.isFinite(
      game.conversationTask.remaining
    ) &&
    game.conversationTask.remaining > 0
  ) {
    tasks.push(
      game.conversationTask.remaining
    );
  }

  if (
    game.cleaningTask &&
    Number.isFinite(
      game.cleaningTask.remaining
    ) &&
    game.cleaningTask.remaining > 0
  ) {
    tasks.push(
      game.cleaningTask.remaining
    );
  }

  if (tasks.length) {
    return Math.max(
      1,
      Math.ceil(
        Math.min(...tasks)
      )
    );
  }

  const futureArrivals =
    game.schedule
      ?.filter(
        event =>
          !event.arrived &&
          Number.isFinite(
            event.arrivalTime
          ) &&
          event.arrivalTime >
            game.minutes
      ) || [];

  if (futureArrivals.length) {
    return Math.max(
      1,
      Math.ceil(
        Math.min(
          ...futureArrivals.map(
            event =>
              event.arrivalTime -
              game.minutes
          )
        )
      )
    );
  }

  return Math.max(
    1,
    Math.ceil(
      timeToMinutes(
        data.config.closingTime
      ) -
      game.minutes
    )
  );
}

function updateWaitButton() {
  if (!waitBtn) return;

  if (!game.started) {
    waitBtn.disabled = false;
    waitBtn.textContent = "Start café";
    return;
  }

  if (game.gameOver) {
    waitBtn.disabled = true;
    return;
  }

  waitBtn.disabled = false;

  const wait =
    getShortestRemainingAction();

  waitBtn.textContent =
    `Wait ${wait} min`;
}


/* =========================================================
   CLEANING
========================================================= */

function startCleaning(slotIndex) {
  if (game.cleaningTask) return;

  if (game.preparationTask) return;

  const slot = game.slots[slotIndex];

  if (
    !slot ||
    !slot.dirty
  ) return;

  game.cleaningTask = {
    slotIndex,
    remaining: data.actions.clean.time,
    total: data.actions.clean.time
  };

  setStatus(
    `Cleaning table ${getSeatLetter(slotIndex)}...`
  );

  updateUI();
}

function completeCleaning() {
  if (!game.cleaningTask) return;

  const index =
    game.cleaningTask.slotIndex;

  game.cleaningTask = null;

  const slot =
    game.slots[index];

  if (
    !slot ||
    !slot.dirty
  ) {
    updateUI();
    return;
  }

  game.slots[index] = null;

  setStatus(
    `Table ${getSeatLetter(index)} is clean.`
  );

  updateUI();
}


/* =========================================================
   UI
========================================================= */

function renderTopBar() {
  if (dayEl) dayEl.textContent = `Day ${game.day}`;

  if (timeEl) timeEl.textContent = minutesToTime(game.minutes);

  if (moneyEl) moneyEl.textContent = money(game.money);

  if (rentEl) {
    rentEl.textContent =
      `${money(rentSaved)} / ${money(data.config.monthlyRent)}`;
  }

  if (rentProgress) {
    rentProgress.style.width =
      `${clamp(
        rentSaved /
        data.config.monthlyRent *
        100,
        0,
        100
      )}%`;
  }

  if (cupcakeLabel) {
    cupcakeLabel.textContent =
      `Cupcakes: ${game.cupcakes}`;
  }
}

function renderCurrentTasks() {
  if (!statusEl) return;

  const lines = [];

  if (game.preparationTask) {
    const task = game.preparationTask;
    const slot = getSlot(task.customerId);
    const product = getProduct(task.productId);

    if (slot && product) {
      lines.push(
        `Making ${slot.nickname}'s ${product.name} · ${Math.max(
          0,
          Math.ceil(task.remaining)
        )} min left`
      );
    }
  }

  if (game.conversationTask) {
    const names =
      game.conversationTask.customerIds
        .map(id => getSlot(id)?.nickname)
        .filter(Boolean);

    if (names.length === 1) {
      lines.push(
        `Talking to ${names[0]} · ${Math.max(
          0,
          Math.ceil(
            game.conversationTask.remaining
          )
        )} min left`
      );
    } else if (names.length > 1) {
      lines.push(
        `Talking to the table · ${Math.max(
          0,
          Math.ceil(
            game.conversationTask.remaining
          )
        )} min left`
      );
    }
  }

  if (game.cleaningTask) {
    lines.push(
      `Cleaning table ${getSeatLetter(
        game.cleaningTask.slotIndex
      )} · ${Math.max(
        0,
        Math.ceil(
          game.cleaningTask.remaining
        )
      )} min left`
    );
  }

  statusEl.innerHTML =
    lines.length
      ? lines.join("<br>")
      : "Choose an action.";
}


/* =========================================================
   CUSTOMER CARD
========================================================= */

function createCustomerHTML(slot, customer, seatIndex) {
  const level = getFriendshipLevel(customer.id);
  const classData = getClass(customer.classId);

  let secondLine =
    getAgeGroup(customer.age);

  if (
    level >=
    data.friendship.class
  ) {
    secondLine =
      `${classData.name} · ${getAgeGroup(customer.age)}`;
  }

  if (
    level >=
    data.friendship.age
  ) {
    secondLine +=
      ` · ${customer.age}`;
  }

  const bottomParts = [];

  if (
    level >=
    data.friendship.patience
  ) {
    bottomParts.push(
      getPatienceLabel(customer.patience)
    );
  }

  if (
    level >=
    data.friendship.tips
  ) {
    bottomParts.push(
      getTipLabel(customer.tip)
    );
  }

  if (
    level >=
    data.friendship.info
  ) {
    bottomParts.push(
      `<span class="customer-info-hover" title="${escapeHTML(
        customer.info
      )}">[i]</span>`
    );
  }

  const orderParts = [];

  for (
    let i = 0;
    i < slot.servedProducts.length;
    i++
  ) {
    orderParts.push("served");
  }

  if (
    slot.pendingProduct !== null
  ) {
    const product =
      getProduct(slot.pendingProduct);

    if (product) {
      orderParts.push(product.name);
    }
  } else if (
    slot.secondOrderRequested
  ) {
    orderParts.push(
      "another order"
    );
  }

  const orderText =
    orderParts.length
      ? orderParts.join(" · ")
      : "No order";

  let taskText = "";

  if (
    game.preparationTask &&
    game.preparationTask.customerId ===
      customer.id
  ) {
    taskText += `
      <div class="customer-preparing">
        Making...
        ${Math.max(
          0,
          Math.ceil(
            game.preparationTask.remaining
          )
        )} min
      </div>
    `;
  }

  if (
    game.conversationTask &&
    game.conversationTask.customerIds.includes(
      customer.id
    )
  ) {
    taskText += `
      <div class="customer-preparing">
        Talking...
        ${Math.max(
          0,
          Math.ceil(
            game.conversationTask.remaining
          )
        )} min
      </div>
    `;
  }

  const waitingText =
    slot.pendingProduct !== null
      ? `${Math.floor(slot.waiting)} min waiting`
      : "served";

  return `
    <div class="customer-letter">
      ${getSeatLetter(seatIndex)}
    </div>

    <div class="customer-name">
      ${escapeHTML(slot.nickname)}
    </div>

    <div class="customer-class">
      ${escapeHTML(secondLine)}
    </div>

    <div class="customer-info">
      ${escapeHTML(
        getLikesText(customer, level)
      )}
    </div>

    ${
      bottomParts.length
        ? `
          <div class="customer-info">
            ${bottomParts.join(" · ")}
          </div>
        `
        : ""
    }

    <div class="customer-order">
      ${escapeHTML(orderText)}
    </div>

    ${taskText}

    <div class="customer-wait">
      ${waitingText}
    </div>
  `;
}

function renderSlots() {
  if (!slotsEl) return;

  slotsEl.innerHTML = "";

  for (
    let i = 0;
    i < data.config.maxSeats;
    i++
  ) {
    const slot = game.slots[i];
    const element = document.createElement("div");

    element.className = "customer";

    if (!slot) {
      element.classList.add("empty");
      element.innerHTML = "<span>Empty</span>";
      slotsEl.appendChild(element);
      continue;
    }

    if (slot.dirty) {
      element.classList.add("empty");
      element.innerHTML =
        "<span>Empty and dirty</span>";
      slotsEl.appendChild(element);
      continue;
    }

    const customer =
      getCustomer(slot.customerId);

    if (!customer) {
      element.classList.add("empty");
      element.innerHTML = "<span>Empty</span>";
      slotsEl.appendChild(element);
      continue;
    }

    element.innerHTML =
      createCustomerHTML(
        slot,
        customer,
        i
      );

    if (
      game.selectedCustomerId ===
      customer.id
    ) {
      element.classList.add(
        "selected"
      );
    }

    element.addEventListener(
      "click",
      () => {
        game.selectedCustomerId =
          customer.id;
        updateUI();
      }
    );

    slotsEl.appendChild(element);
  }
}


/* =========================================================
   ACTION BUTTON
========================================================= */

function addActionButton(label, callback, parent) {
  const button =
    document.createElement("button");

  button.className =
    "action-btn";

  button.textContent =
    label;

  button.addEventListener(
    "click",
    callback
  );

  parent.appendChild(button);

  return button;
}


/* =========================================================
   ACTIONS
========================================================= */

function renderActions() {
  if (!actionsEl) return;

  actionsEl.innerHTML = "";

  if (
    !game.started ||
    game.gameOver
  ) return;


  /* =======================================================
     PREPARATION
  ======================================================= */

  const prepRow =
    document.createElement("div");

  prepRow.className =
    "action-row";

  const prepTitle =
    document.createElement("div");

  prepTitle.className =
    "action-row-title";

  prepTitle.textContent =
    "Preparation";

  prepRow.appendChild(
    prepTitle
  );

  for (
    const slot of game.slots
  ) {
    if (
      !slot ||
      slot.dirty ||
      slot.pendingProduct === null
    ) continue;

    const product =
      getProduct(
        slot.pendingProduct
      );

    if (!product) continue;

    const button =
      addActionButton(
        `Make ${slot.nickname}'s ${product.name}`,
        () =>
          startPreparation(
            slot.customerId
          ),
        prepRow
      );

    button.disabled =
      Boolean(
        game.preparationTask
      );
  }

  if (
    prepRow.children.length > 1
  ) {
    actionsEl.appendChild(
      prepRow
    );
  }


  /* =======================================================
     PEOPLE
  ======================================================= */

  const peopleRow =
    document.createElement("div");

  peopleRow.className =
    "action-row";

  const peopleTitle =
    document.createElement("div");

  peopleTitle.className =
    "action-row-title";

  peopleTitle.textContent =
    "People";

  peopleRow.appendChild(
    peopleTitle
  );


  /*
    Individual chat
  */

  for (
    const slot of game.slots
  ) {
    if (
      !slot ||
      slot.dirty
    ) continue;

    const button =
      addActionButton(
        `Talk to ${slot.nickname} · ${data.actions.chat.time} min`,
        () =>
          startConversation(
            [slot.customerId],
            data.actions.chat.time
          ),
        peopleRow
      );

    button.disabled =
      Boolean(
        game.conversationTask
      );
  }


  /*
    Group chat
  */

  const present =
    game.slots.filter(
      slot =>
        slot &&
        !slot.dirty
    );

  if (
    present.length >= 2
  ) {
    const button =
      addActionButton(
        `Talk to the table · ${data.actions.tableChat.time} min`,
        startTableConversation,
        peopleRow
      );

    button.disabled =
      Boolean(
        game.conversationTask
      );
  }


  /*
    Cupcakes
  */

  for (
    const slot of game.slots
  ) {
    if (
      !slot ||
      slot.dirty ||
      slot.cupcakeGiven
    ) continue;

    const button =
      addActionButton(
        `Offer cupcake to ${slot.nickname} (${game.cupcakes} left) · -${money(
          data.config.cupcakeCost
        )}`,
        () =>
          giveCupcake(
            slot.customerId
          ),
        peopleRow
      );

    button.disabled =
      game.cupcakes <= 0 ||
      game.money <
        data.config.cupcakeCost;
  }

  if (
    peopleRow.children.length > 1
  ) {
    actionsEl.appendChild(
      peopleRow
    );
  }


  /* =======================================================
     ORDERS
  ======================================================= */

  const orderRow =
    document.createElement("div");

  orderRow.className =
    "action-row";

  const orderTitle =
    document.createElement("div");

  orderTitle.className =
    "action-row-title";

  orderTitle.textContent =
    "Orders";

  orderRow.appendChild(
    orderTitle
  );

  for (
    const slot of game.slots
  ) {
    if (
      !slot ||
      slot.dirty ||
      !canTakeOrder(slot)
    ) continue;

    const first =
      slot.servedProducts.length === 0;

    addActionButton(
      first
        ? `Take ${slot.nickname}'s order`
        : `Take another order from ${slot.nickname}`,
      () =>
        takeOrder(
          slot.customerId
        ),
      orderRow
    );
  }

  if (
    orderRow.children.length > 1
  ) {
    actionsEl.appendChild(
      orderRow
    );
  }


  /* =======================================================
     TABLES
  ======================================================= */

  const tableRow =
    document.createElement("div");

  tableRow.className =
    "action-row";

  const tableTitle =
    document.createElement("div");

  tableTitle.className =
    "action-row-title";

  tableTitle.textContent =
    "Tables";

  tableRow.appendChild(
    tableTitle
  );

  game.slots.forEach(
    (slot, index) => {
      if (
        !slot ||
        !slot.dirty
      ) return;

      const button =
        addActionButton(
          `Clean table ${getSeatLetter(
            index
          )} · ${data.actions.clean.time} min`,
          () =>
            startCleaning(
              index
            ),
          tableRow
        );

      button.disabled =
        Boolean(
          game.preparationTask ||
          game.cleaningTask
        );
    }
  );

  if (
    tableRow.children.length > 1
  ) {
    actionsEl.appendChild(
      tableRow
    );
  }
}


/* =========================================================
   TOP BAR / UPDATE
========================================================= */

function updateUI() {
  renderTopBar();
  renderSlots();
  renderCurrentTasks();
  renderActions();
  updateWaitButton();
}


/* =========================================================
   END-DAY EVENTS
========================================================= */

function getDailyEvent() {
  if (!Array.isArray(data.events) || !data.events.length) return null;

  const validEvents =
    data.events.filter(
      event =>
        Math.random() <
        Number(event.chance || 0)
    );

  if (!validEvents.length) return null;

  return validEvents[
    randomInt(
      0,
      validEvents.length - 1
    )
  ];
}

function applyDailyEvent(event) {
  if (!event) return;

  const amount =
    Number(event.money || 0);

  game.money += amount;
  game.dailyIncome += amount;
}


/* =========================================================
   END DAY
========================================================= */

function endDay() {
  if (
    !game.started ||
    game.gameOver
  ) return;


  /*
    Customers leave normally.
    Their tips are collected.
    No friendship penalty.
  */

  for (
    const slot of game.slots
  ) {
    if (
      !slot ||
      slot.dirty ||
      !slot.customerId
    ) continue;

    const customer =
      getCustomer(
        slot.customerId
      );

    collectTip(
      slot,
      customer
    );
  }


  /*
    Everything is automatically cleaned
    when the cafe closes.
  */

  game.slots =
    Array(
      data.config.maxSeats
    ).fill(null);

  game.preparationTask = null;
  game.conversationTask = null;
  game.cleaningTask = null;
  game.selectedCustomerId = null;


  /*
    Keep exactly:
      cupcakesPerDay * cupcakeCost
      + dailyBills

    Pay bills and random event
    Everything else moves to rent.
  */

  const pocket =
    data.config.cupcakesPerDay *
    data.config.cupcakeCost +
    data.config.dailyBills;

  const rentTransfer =
    game.money - data.config.dailyBills - pocket;

  rentSaved +=
    rentTransfer;

  game.money =
    pocket;


  /*
    If rent becomes negative, the player
    could not cover the daily expenses.
  */

  if (
    rentSaved < 0
  ) {
    endGame(
      data.texts.rentFailed
    );
    return;
  }


  const finishedDay =
    game.day;


  /*
    Optional daily event.
  */

  const event =
    getDailyEvent();

  if (event) {
    applyDailyEvent(event);
  }


  /*
    Monthly rent.
  */

  let rentMessage =
    "";

  if (
    finishedDay %
      data.config.daysPerMonth ===
    0
  ) {
    if (
      rentSaved >=
      data.config.monthlyRent
    ) {
      rentSaved -=
        data.config.monthlyRent;

      rentMessage =
        `<p>${escapeHTML(
          data.texts.rentPaid
        )}</p>`;
    } else {
      endGame(
        data.texts.rentFailed
      );
      return;
    }
  }


  game.day++;

  game.minutes =
    timeToMinutes(
      data.config.openingTime
    );


  const eventMessage =
    event
      ? `
        <p>
          <strong>
            ${escapeHTML(
              event.title ||
              "Something happened"
            )}
          </strong>
        </p>

        <p>
          ${escapeHTML(
            event.description ||
            ""
          )}
        </p>

        ${
          Number(event.money || 0) !== 0
            ? `
              <p>
                Impact:
                <strong>
                  ${
                    Number(event.money) > 0
                      ? "+"
                      : ""
                  }${money(
                    Number(event.money)
                  )}
                </strong>
              </p>
            `
            : ""
        }
      `
      : "";


  openModal(
    data.texts.endDayTitle.replace(
      "{day}",
      finishedDay
    ),

    `
      <p>
        ${escapeHTML(
          data.texts.dailyIncome
        )}
        <strong>
          ${money(
            game.dailyIncome
          )}
        </strong>
      </p>

      <p>
        ${escapeHTML(
          data.texts.dailyBill
        )}
        <strong>
          -${money(
            data.config.dailyBills
          )}
        </strong>
      </p>

      <p>
        ${escapeHTML(
          data.texts.movedToRent
        )}
        <strong>
          ${money(
            rentTransfer
          )}
        </strong>
      </p>

      ${eventMessage}

      <p>
        ${escapeHTML(
          data.texts.rentSaved
        )}
        <strong>
          ${money(
            rentSaved
          )}
          /
          ${money(
            data.config.monthlyRent
          )}
        </strong>
      </p>

      ${rentMessage}

      <p>
        ${escapeHTML(
          data.texts.cashKept
        )}
        <strong>
          ${money(
            game.money
          )}
        </strong>
      </p>
    `,

    [
      {
        label:
          data.texts.openCafe,

        onClick: () => {
          closeModal();
          startDay();
        }
      }
    ]
  );
}


/* =========================================================
   END GAME
========================================================= */

function endGame(message) {
  game.gameOver = true;

  openModal(
    message,

    `
      <p>
        ${escapeHTML(
          data.texts.rentSaved
        )}
        <strong>
          ${money(
            rentSaved
          )}
        </strong>
      </p>

      <p>
        ${escapeHTML(
          data.texts.rentRequired
        )}
        <strong>
          ${money(
            data.config.monthlyRent
          )}
        </strong>
      </p>
    `,

    [
      {
        label:
          data.texts.playAgain,

        onClick: () => {
          closeModal();
          startGame();
        }
      }
    ]
  );
}


/* =========================================================
   RULES
========================================================= */

function showRules() {
  const t = data.texts.rules;

  openModal(
    t.title,

    `
      <p>${escapeHTML(t.intro)}</p>

      <h3>${escapeHTML(t.timeTitle)}</h3>
      <p>${escapeHTML(t.time)}</p>

      <h3>${escapeHTML(t.activitiesTitle)}</h3>

      <ul>
        ${t.activities
          .map(
            text =>
              `<li>${escapeHTML(
                text
                  .replace(
                    "{arrivalShift}",
                    data.config.arrivalShift
                  )
                  .replace(
                    "{maxOrders}",
                    data.config.maxOrders
                  )
              )}</li>`
          )
          .join("")}
      </ul>

      <h3>${escapeHTML(t.customersTitle)}</h3>

      <ul>
        ${t.customers
          .map(
            text =>
              `<li>${escapeHTML(
                text
                  .replace(
                    "{arrivalShift}",
                    data.config.arrivalShift
                  )
                  .replace(
                    "{maxOrders}",
                    data.config.maxOrders
                  )
              )}</li>`
          )
          .join("")}
      </ul>

      <h3>${escapeHTML(t.tablesTitle)}</h3>
      <p>${escapeHTML(t.tables)}</p>

      <h3>${escapeHTML(t.friendshipTitle)}</h3>
      <p>${escapeHTML(t.friendship)}</p>

      <h3>${escapeHTML(t.satisfationTitle)}</h3>
      <p>${escapeHTML(t.satisfation)}</p>

      <h3>${escapeHTML(t.cupcakesTitle)}</h3>
      <p>${escapeHTML(t.cupcakes)}</p>

      <h3>${escapeHTML(t.eventsTitle)}</h3>
      <p>${escapeHTML(t.events)}</p>

      <h3>${escapeHTML(t.goalTitle)}</h3>
      <p>${escapeHTML(t.goal)}</p>
    `
  );
}


/* =========================================================
   MODAL
========================================================= */

function openModal(title, body, actions = []) {
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modalActions.innerHTML = "";

  for (const action of actions) {
    const button =
      document.createElement(
        "button"
      );

    button.textContent =
      action.label;

    button.addEventListener(
      "click",
      action.onClick
    );

    modalActions.appendChild(
      button
    );
  }

  modal.classList.remove(
    "hidden"
  );
}

function closeModal() {
  modal.classList.add(
    "hidden"
  );

  modalActions.innerHTML =
    "";
}


/* =========================================================
   EVENTS
========================================================= */

infoBtn?.addEventListener(
  "click",
  showRules
);

modalClose?.addEventListener(
  "click",
  closeModal
);

modal?.addEventListener(
  "click",
  event => {
    if (
      event.target === modal
    ) {
      closeModal();
    }
  }
);

endDayBtn?.addEventListener(
  "click",
  endDay
);

waitBtn?.addEventListener(
  "click",
  () => {
    if (!game.started) {
      startGame();
      return;
    }

    advanceTime(
      getShortestRemainingAction()
    );
  }
);


/* =========================================================
   INITIALIZE
========================================================= */

loadGameData();
