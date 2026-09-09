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
      groceries: { single: 250, married: 400, withKids: 600 },
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
      padel: { none: 0, casual: 40, regular: 80, serious: 120 },
      otherSports: { none: 0, casual: 20, active: 50 },
      sportEquipment: 20,
      healthInsurance: { single: 60, married: 100, withKids: 150 },
      medications: 20,
      haircuts: 25,
      personalCare: 30,
      netflix: 9,
      spotify: 11,
      icloud: 3,
      otherSubscriptions: 10,
      cinema: 20,
      entertainment: 40,
      clothing: 40,
      petFood: 0,
      petVet: 0,
      childcare: 0,
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
      groceries: { single: 350, married: 600, withKids: 900 },
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
      padel: { none: 0, casual: 60, regular: 120, serious: 200 },
      otherSports: { none: 0, casual: 40, active: 100 },
      sportEquipment: 40,
      healthInsurance: { single: 200, married: 400, withKids: 600 },
      medications: 50,
      haircuts: 40,
      personalCare: 50,
      netflix: 15,
      spotify: 11,
      icloud: 3,
      otherSubscriptions: 20,
      cinema: 30,
      entertainment: 80,
      clothing: 80,
      petFood: 50,
      petVet: 80,
      childcare: 1200,
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
      groceries: { single: 400, married: 700, withKids: 1000 },
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
      padel: { none: 0, casual: 60, regular: 120, serious: 180 },
      otherSports: { none: 0, casual: 50, active: 120 },
      sportEquipment: 50,
      healthInsurance: { single: 150, married: 280, withKids: 400 },
      medications: 40,
      haircuts: 50,
      personalCare: 60,
      netflix: 15,
      spotify: 12,
      icloud: 4,
      otherSubscriptions: 25,
      cinema: 35,
      entertainment: 100,
      clothing: 100,
      petFood: 60,
      petVet: 100,
      childcare: 1500,
      gifts: 60,
      miscellaneous: 120,
      emergencyFund: 500,
      retirementSavings: 400,
    },
  },
};

export function calculateComprehensiveBudget(userProfile) {
  const { country, monthlyIncome, age, hasKids, maritalStatus, usePublicTransport, usesCar, gymOption, padelOption, otherSportsOption, subscriptions, hasPets, petCount, transportCard, ridesPerMonth } = userProfile;
  const countryInfo = countryData[country];
  if (!countryInfo) throw new Error('Country not supported');

  const costs = countryInfo.costs;
  const householdType = hasKids === 'yes' ? 'withKids' : maritalStatus === 'single' ? 'single' : 'married';

  const ageBand = age < 26 ? 'under26' : age < 31 ? 'age26to30' : age >= 65 ? 'senior' : 'age30plus';

  // A travel card is a flat monthly pass; without one you pay per ride, which
  // is cheaper only for light users. The questionnaire lets you compare both.
  const getTransportCost = () => {
    if (usePublicTransport === 'no') return 0;
    const rides = Math.min(Math.max(parseInt(ridesPerMonth, 10) || 40, 0), 300);
    if (transportCard === 'no') {
      return Math.round(costs.publicTransport.singleRide * rides);
    }
    return costs.publicTransport.monthlyPass[ageBand];
  };

  let budget = {
    country: countryInfo.name,
    currency: countryInfo.currency,
    monthlyIncome,
    age,
    categories: {
      'Housing': costs.rent[householdType],
      'Rent Insurance': costs.rentInsurance,
      'Electricity': costs.electricity[householdType],
      'Water': costs.water,
      'Gas': costs.gas[householdType],
      'Internet': costs.internet,
      'Phone': costs.phone,
      'Groceries': costs.groceries[householdType],
      'Dining Out': costs.dining[householdType],
      'Coffee & Snacks': costs.coffee[householdType],
      'Public Transport': getTransportCost(),
      'Car Payment': usesCar === 'yes' ? costs.carPayment : 0,
      'Car Insurance': usesCar === 'yes' ? costs.carInsurance : 0,
      'Fuel': usesCar === 'yes' ? costs.fuel : 0,
      'Parking': usesCar === 'yes' ? costs.parking : 0,
      'Car Maintenance': usesCar === 'yes' ? costs.maintenance : 0,
      'Gym': gymOption && gymOption !== 'none' ? costs.gym[gymOption] : 0,
      'Padel': padelOption && padelOption !== 'none' ? costs.padel[padelOption] : 0,
      'Other Sports': otherSportsOption && otherSportsOption !== 'none' ? costs.otherSports[otherSportsOption] : 0,
      'Sports Equipment': (gymOption !== 'none' || padelOption !== 'none' || otherSportsOption !== 'none') ? costs.sportEquipment : 0,
      'Health Insurance': costs.healthInsurance[householdType],
      'Medications': costs.medications,
      'Haircuts': costs.haircuts,
      'Personal Care': costs.personalCare,
      'Netflix': subscriptions && subscriptions.includes('netflix') ? costs.netflix : 0,
      'Spotify': subscriptions && subscriptions.includes('spotify') ? costs.spotify : 0,
      'iCloud+': subscriptions && subscriptions.includes('icloud') ? costs.icloud : 0,
      'Other Subscriptions': subscriptions && subscriptions.includes('other') ? costs.otherSubscriptions : 0,
      'Cinema & Entertainment': costs.cinema + costs.entertainment,
      'Clothing': costs.clothing,
      'Pet Food': hasPets === 'yes' ? costs.petFood * petCount : 0,
      'Pet Vet': hasPets === 'yes' ? costs.petVet : 0,
      'Childcare': hasKids === 'yes' ? costs.childcare : 0,
      'Gifts': costs.gifts,
      'Miscellaneous': costs.miscellaneous,
      'Emergency Fund': costs.emergencyFund,
      'Retirement Savings': costs.retirementSavings,
    },
  };

  budget.totalExpenses = Object.values(budget.categories).reduce((a, b) => a + b, 0);
  budget.surplus = monthlyIncome - budget.totalExpenses;
  budget.savingsRate = (((budget.categories['Emergency Fund'] + budget.categories['Retirement Savings']) / monthlyIncome) * 100).toFixed(1);
  budget.recommendations = generateRecommendations(budget, userProfile);

  return budget;
}

function generateRecommendations(budget, userProfile) {
  const recommendations = [];
  const housingPercent = (budget.categories['Housing'] / budget.monthlyIncome) * 100;
  const foodPercent = ((budget.categories['Groceries'] + budget.categories['Dining Out']) / budget.monthlyIncome) * 100;

  if (budget.surplus > 500) {
    recommendations.push('💡 Excellent surplus! Consider increasing retirement savings or building investment portfolio.');
  } else if (budget.surplus < -200) {
    recommendations.push('⚠️ Budget is tight. Consider reducing dining out or entertainment spending.');
  } else if (budget.surplus < 0) {
    recommendations.push('⚠️ Monthly deficit. Review discretionary spending categories.');
  }

  if (housingPercent > 40) {
    recommendations.push('🏠 Housing is >40% of income. Consider finding cheaper accommodation or getting a roommate.');
  }

  if (foodPercent > 20) {
    recommendations.push('🍔 Food spending is >20% of income. Try meal planning or reducing dining out.');
  }

  if (userProfile.usePublicTransport === 'no' && userProfile.usesCar === 'yes') {
    recommendations.push('🚗 Car costs are high. Consider using public transport part-time.');
  }

  if (budget.categories['Miscellaneous'] > 100) {
    recommendations.push('💸 Miscellaneous expenses are high. Track where this money goes to find savings.');
  }

  return recommendations;
}
