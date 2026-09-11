// Monthly cost estimates per country. These are modelled figures for a typical
// household, not real prices — the live price lookup is what replaces them.

const ACTIVITY_LABELS = {
  padel: 'Padel',
  football: 'Football',
  tennis: 'Tennis',
  swimming: 'Swimming',
  running: 'Running',
  climbing: 'Climbing',
  yoga: 'Yoga or Pilates',
  cycling: 'Cycling',
  martialArts: 'Martial arts',
  dance: 'Dance',
  other: 'Something else',
};

const countryData = {
  spain: {
    name: 'Spain',
    currency: '€',
    costs: {
      rent: { single: 700, married: 900, withKids: 1200 },
      rentInsurance: 15,
      electricity: { single: 80, married: 120, withKids: 150 },
      water: 25,
      gas: { single: 30, married: 40, withKids: 50 },
      internet: 40,
      phone: 25,
      groceries: { single: 250, married: 400, withKids: 520 },
      dining: { single: 120, married: 200, withKids: 250 },
      coffee: { single: 30, married: 50, withKids: 60 },
      publicTransport: {
        monthlyPass: { under26: 20, age26to30: 55, age30plus: 55, senior: 12 },
        singleRide: 1.5,
      },
      carPayment: 200,
      carInsurance: 100,
      fuel: 100,
      parking: 30,
      maintenance: 50,
      gym: { none: 0, budget: 30, midrange: 45, premium: 65 },
      activities: {
        padel: 60, football: 40, tennis: 55, swimming: 35, running: 10,
        climbing: 50, yoga: 55, cycling: 20, martialArts: 50, dance: 45, other: 40,
      },
      sportEquipment: 20,
      healthInsurance: { single: 60, married: 100, withKids: 150 },
      medications: 20,
      haircuts: 25,
      personalCare: 30,
      subscriptionPrices: {
        netflix: { ads: 6.99, standard: 13.99, premium: 19.99 },
        spotify: { student: 5.99, individual: 11.99, duo: 15.99, family: 19.99 },
        icloud: { gb50: 0.99, gb200: 2.99, tb2: 9.99 },
        other: { one: 10, several: 25 },
      },
      cinema: 20,
      entertainment: 40,
      clothing: 40,
      petFood: 35,
      petVet: 25,
      // Per child, per month. Nursery in Spain runs far higher than school age,
      // so this is an average across the years a child is dependent.
      perChild: { childcare: 300, food: 120, clothing: 25, health: 30, activities: 40 },
      gifts: 30,
      miscellaneous: 50,
      emergencyFund: 200,
      retirementSavings: 100,
    },
  },
  usa: {
    name: 'USA',
    currency: '$',
    costs: {
      rent: { single: 1300, married: 1700, withKids: 2200 },
      rentInsurance: 20,
      electricity: { single: 120, married: 170, withKids: 220 },
      water: 50,
      gas: { single: 60, married: 80, withKids: 100 },
      internet: 70,
      phone: 80,
      groceries: { single: 350, married: 600, withKids: 780 },
      dining: { single: 200, married: 350, withKids: 500 },
      coffee: { single: 50, married: 80, withKids: 100 },
      publicTransport: {
        monthlyPass: { under26: 60, age26to30: 100, age30plus: 100, senior: 45 },
        singleRide: 2.9,
      },
      carPayment: 400,
      carInsurance: 150,
      fuel: 200,
      parking: 60,
      maintenance: 100,
      gym: { none: 0, budget: 30, midrange: 60, premium: 100 },
      activities: {
        padel: 90, football: 60, tennis: 90, swimming: 55, running: 15,
        climbing: 75, yoga: 90, cycling: 30, martialArts: 110, dance: 80, other: 70,
      },
      sportEquipment: 40,
      healthInsurance: { single: 200, married: 400, withKids: 600 },
      medications: 50,
      haircuts: 40,
      personalCare: 50,
      subscriptionPrices: {
        netflix: { ads: 7.99, standard: 17.99, premium: 24.99 },
        spotify: { student: 5.99, individual: 11.99, duo: 16.99, family: 19.99 },
        icloud: { gb50: 0.99, gb200: 2.99, tb2: 9.99 },
        other: { one: 20, several: 45 },
      },
      cinema: 30,
      entertainment: 80,
      clothing: 80,
      petFood: 50,
      petVet: 80,
      perChild: { childcare: 1000, food: 180, clothing: 40, health: 150, activities: 60 },
      gifts: 50,
      miscellaneous: 100,
      emergencyFund: 400,
      retirementSavings: 300,
    },
  },
  australia: {
    name: 'Australia',
    currency: '$',
    costs: {
      rent: { single: 1500, married: 1900, withKids: 2400 },
      rentInsurance: 25,
      electricity: { single: 150, married: 220, withKids: 280 },
      water: 70,
      gas: { single: 50, married: 70, withKids: 90 },
      internet: 80,
      phone: 50,
      groceries: { single: 400, married: 700, withKids: 880 },
      dining: { single: 250, married: 400, withKids: 600 },
      coffee: { single: 60, married: 100, withKids: 120 },
      publicTransport: {
        monthlyPass: { under26: 90, age26to30: 130, age30plus: 130, senior: 50 },
        singleRide: 3.2,
      },
      carPayment: 450,
      carInsurance: 180,
      fuel: 220,
      parking: 80,
      maintenance: 120,
      gym: { none: 0, budget: 40, midrange: 70, premium: 100 },
      activities: {
        padel: 80, football: 55, tennis: 75, swimming: 50, running: 15,
        climbing: 70, yoga: 85, cycling: 30, martialArts: 95, dance: 75, other: 65,
      },
      sportEquipment: 50,
      healthInsurance: { single: 150, married: 280, withKids: 400 },
      medications: 40,
      haircuts: 50,
      personalCare: 60,
      subscriptionPrices: {
        netflix: { ads: 7.99, standard: 18.99, premium: 25.99 },
        spotify: { student: 6.99, individual: 13.99, duo: 18.99, family: 22.99 },
        icloud: { gb50: 1.49, gb200: 4.49, tb2: 14.99 },
        other: { one: 25, several: 55 },
      },
      cinema: 35,
      entertainment: 100,
      clothing: 100,
      petFood: 60,
      petVet: 100,
      perChild: { childcare: 1300, food: 200, clothing: 45, health: 80, activities: 70 },
      gifts: 60,
      miscellaneous: 120,
      emergencyFund: 500,
      retirementSavings: 400,
    },
  },
};

export const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_LABELS).map(([id, label]) => ({ id, label }));

// Each service has tiers that differ by a lot — a Spotify Family is roughly
// double an Individual — so the plan is asked for rather than assumed.
export const SUBSCRIPTION_OPTIONS = [
  {
    id: 'netflix',
    label: 'Netflix',
    plans: [
      { id: 'none', label: 'Not subscribed' },
      { id: 'ads', label: 'Standard with ads' },
      { id: 'standard', label: 'Standard' },
      { id: 'premium', label: 'Premium' },
    ],
  },
  {
    id: 'spotify',
    label: 'Spotify',
    plans: [
      { id: 'none', label: 'Not subscribed' },
      { id: 'student', label: 'Student' },
      { id: 'individual', label: 'Individual' },
      { id: 'duo', label: 'Duo' },
      { id: 'family', label: 'Family' },
    ],
  },
  {
    id: 'icloud',
    label: 'iCloud+',
    plans: [
      { id: 'none', label: 'Not subscribed' },
      { id: 'gb50', label: '50 GB' },
      { id: 'gb200', label: '200 GB' },
      { id: 'tb2', label: '2 TB' },
    ],
  },
  {
    id: 'other',
    label: 'Other apps',
    plans: [
      { id: 'none', label: 'None' },
      { id: 'one', label: 'One or two' },
      { id: 'several', label: 'Several' },
    ],
  },
];

const SUBSCRIPTION_LABELS = Object.fromEntries(
  SUBSCRIPTION_OPTIONS.map((s) => [s.id, Object.fromEntries(s.plans.map((p) => [p.id, p.label]))])
);

// Someone who ticked a box before an option existed keeps a sensible plan.
const LEGACY_PLAN = { netflix: 'standard', spotify: 'individual', icloud: 'gb200', other: 'one' };

function resolvePlans({ subscriptionPlans, subscriptions }) {
  if (subscriptionPlans && typeof subscriptionPlans === 'object') return subscriptionPlans;
  if (Array.isArray(subscriptions)) {
    return Object.fromEntries(subscriptions.map((id) => [id, LEGACY_PLAN[id] || 'none']));
  }
  return {};
}

export function calculateComprehensiveBudget(userProfile) {
  const {
    country, monthlyIncome, age, maritalStatus, usePublicTransport, usesCar,
    gymOption, activities, subscriptions, subscriptionPlans, hasPets, petCount,
    transportCard, ridesPerMonth, childCount,
    rentOverride, billsOverride, currentSavings, categoryOverrides,
  } = userProfile;

  const countryInfo = countryData[country];
  if (!countryInfo) throw new Error('Country not supported');

  const costs = countryInfo.costs;
  const kids = Math.min(Math.max(parseInt(childCount, 10) || 0, 0), 8);
  const pets = Math.min(Math.max(parseInt(petCount, 10) || 0, 0), 8);
  const householdType = kids > 0 ? 'withKids' : maritalStatus === 'single' ? 'single' : 'married';
  const ageBand = age < 26 ? 'under26' : age < 31 ? 'age26to30' : age >= 65 ? 'senior' : 'age30plus';

  // A travel card is a flat monthly pass; paying per ride is cheaper only for
  // light users, so the questionnaire lets you compare the two.
  const transportCost = () => {
    if (usePublicTransport === 'no') return 0;
    const rides = Math.min(Math.max(parseInt(ridesPerMonth, 10) || 40, 0), 300);
    if (transportCard === 'no') return Math.round(costs.publicTransport.singleRide * rides);
    return costs.publicTransport.monthlyPass[ageBand];
  };

  const chosenActivities = Array.isArray(activities) ? activities : [];
  const activitiesCost = chosenActivities.reduce((sum, id) => sum + (costs.activities[id] || 0), 0);
  const doesSomething = gymOption !== 'none' || chosenActivities.length > 0;

  const plans = resolvePlans({ subscriptionPlans, subscriptions });
  const planCost = (service) => {
    const plan = plans[service];
    if (!plan || plan === 'none') return 0;
    return costs.subscriptionPrices[service]?.[plan] || 0;
  };

  const perChild = costs.perChild;

  // What someone actually pays beats a modelled estimate, so an entered figure
  // replaces it outright.
  const money = (value) => {
    const n = parseFloat(value);
    return Number.isFinite(n) && n >= 0 && n < 100000 ? n : null;
  };
  const rent = money(rentOverride);
  const bills = money(billsOverride);

  const BILL_KEYS = ['Electricity', 'Water', 'Gas', 'Internet', 'Phone'];
  const modelledBills = {
    'Electricity': costs.electricity[householdType],
    'Water': costs.water,
    'Gas': costs.gas[householdType],
    'Internet': costs.internet,
    'Phone': costs.phone,
  };
  const modelledBillTotal = BILL_KEYS.reduce((sum, k) => sum + modelledBills[k], 0);
  // An entered bills total keeps the individual lines, scaled to match it, so
  // the breakdown still shows where it goes.
  const billScale = bills !== null && modelledBillTotal > 0 ? bills / modelledBillTotal : 1;
  const billFor = (key) => Math.round(modelledBills[key] * billScale);

  const categories = {
    'Housing': rent !== null ? rent : costs.rent[householdType],
    'Rent Insurance': costs.rentInsurance,
    'Electricity': billFor('Electricity'),
    'Water': billFor('Water'),
    'Gas': billFor('Gas'),
    'Internet': billFor('Internet'),
    'Phone': billFor('Phone'),
    'Groceries': costs.groceries[householdType] + kids * perChild.food,
    'Dining Out': costs.dining[householdType],
    'Coffee & Snacks': costs.coffee[householdType],
    'Public Transport': transportCost(),
    'Car Payment': usesCar === 'yes' ? costs.carPayment : 0,
    'Car Insurance': usesCar === 'yes' ? costs.carInsurance : 0,
    'Fuel': usesCar === 'yes' ? costs.fuel : 0,
    'Parking': usesCar === 'yes' ? costs.parking : 0,
    'Car Maintenance': usesCar === 'yes' ? costs.maintenance : 0,
    'Gym': gymOption && gymOption !== 'none' ? costs.gym[gymOption] : 0,
    'Sports & Activities': activitiesCost,
    'Sports Equipment': doesSomething ? costs.sportEquipment : 0,
    'Health Insurance': costs.healthInsurance[householdType] + kids * perChild.health,
    'Medications': costs.medications,
    'Haircuts': costs.haircuts,
    'Personal Care': costs.personalCare,
    'Netflix': planCost('netflix'),
    'Spotify': planCost('spotify'),
    'iCloud+': planCost('icloud'),
    'Other Subscriptions': planCost('other'),
    'Cinema & Entertainment': costs.cinema + costs.entertainment,
    'Clothing': costs.clothing + kids * perChild.clothing,
    'Pet Food': hasPets === 'yes' ? costs.petFood * pets : 0,
    'Pet Vet': hasPets === 'yes' ? costs.petVet * pets : 0,
    'Childcare': kids * perChild.childcare,
    "Children's Activities": kids * perChild.activities,
    'Gifts': costs.gifts,
    'Miscellaneous': costs.miscellaneous,
    'Emergency Fund': costs.emergencyFund,
    'Retirement Savings': costs.retirementSavings,
  };

  // Every figure here is a modelled average until someone tells us otherwise,
  // so an entered amount for any category replaces it outright.
  if (categoryOverrides && typeof categoryOverrides === 'object') {
    for (const [name, value] of Object.entries(categoryOverrides)) {
      const amount = money(value);
      if (amount !== null && name in categories) categories[name] = amount;
    }
  }

  const budget = {
    country: countryInfo.name,
    currency: countryInfo.currency,
    monthlyIncome,
    age,
    childCount: kids,
    activities: chosenActivities.map((id) => ACTIVITY_LABELS[id]).filter(Boolean),
    currentSavings: money(currentSavings),
    subscriptionPlans: plans,
    subscriptionLabels: Object.fromEntries(
      Object.entries(plans)
        .filter(([, plan]) => plan && plan !== 'none')
        .map(([service, plan]) => [service, SUBSCRIPTION_LABELS[service]?.[plan] || plan])
    ),
    usesRealRent: rent !== null,
    usesRealBills: bills !== null,
    categoryOverrides: categoryOverrides || {},
    categories,
  };

  budget.totalExpenses = Object.values(categories).reduce((a, b) => a + b, 0);
  budget.surplus = monthlyIncome - budget.totalExpenses;
  budget.savingsRate = (
    ((categories['Emergency Fund'] + categories['Retirement Savings']) / monthlyIncome) * 100
  ).toFixed(1);
  // How long the savings would last if the income stopped — the number that
  // makes a savings balance mean something.
  budget.monthsOfRunway =
    budget.currentSavings !== null && budget.totalExpenses > 0
      ? Number((budget.currentSavings / budget.totalExpenses).toFixed(1))
      : null;

  budget.recommendations = generateRecommendations(budget, userProfile, kids);

  return budget;
}

function generateRecommendations(budget, userProfile, kids) {
  const out = [];
  const pct = (amount) => (amount / budget.monthlyIncome) * 100;
  const c = budget.categories;

  if (budget.surplus > 500) {
    out.push('Excellent surplus. Consider increasing retirement savings or starting an investment plan.');
  } else if (budget.surplus < -200) {
    out.push('You are spending more than you earn. Dining out and entertainment are the usual first cuts.');
  } else if (budget.surplus < 0) {
    out.push('A small monthly deficit. Trimming one or two discretionary categories should close it.');
  }

  if (pct(c['Housing']) > 40) {
    out.push('Housing is over 40% of your income. A flatmate or a cheaper area would move the needle more than anything else here.');
  }

  if (pct(c['Groceries'] + c['Dining Out']) > 20) {
    out.push('Food is over 20% of your income. Meal planning tends to beat cutting dining out entirely.');
  }

  if (userProfile.usePublicTransport === 'no' && userProfile.usesCar === 'yes') {
    out.push('Running a car is your most expensive transport option. Even part-time public transport use adds up.');
  }

  if (userProfile.transportCard === 'no' && c['Public Transport'] > 0) {
    out.push('You are paying per ride. At your usage a monthly travel card may well be cheaper — check the live prices on your dashboard.');
  }

  if (kids > 0 && c['Childcare'] > 0 && pct(c['Childcare']) > 20) {
    out.push('Childcare is over a fifth of your income. Check what subsidies or tax deductions you qualify for.');
  }

  if (budget.monthsOfRunway !== null) {
    if (budget.monthsOfRunway < 3) {
      out.push(`Your savings would cover about ${budget.monthsOfRunway} months of outgoings. Three to six months is the usual target for an emergency fund.`);
    } else if (budget.monthsOfRunway > 12) {
      out.push(`You have over a year of outgoings saved. Beyond about six months, money sitting in cash is losing value to inflation.`);
    }
  }

  if (!budget.usesRealRent && pct(c['Housing']) > 25) {
    out.push('Housing is the biggest estimate here. Enter what you actually pay to make the rest of the budget meaningful.');
  }

  if (c['Miscellaneous'] > 100) {
    out.push('Miscellaneous is high. Tracking where it goes for a month usually finds real savings.');
  }

  return out;
}
