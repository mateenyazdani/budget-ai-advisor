// Budget data for different countries
const countryData = {
  spain: {
    name: 'Spain',
    currency: '€',
    costs: {
      rent: { single: 600, married: 800, withKids: 1000 },
      utilities: { single: 120, married: 150, withKids: 180 },
      internet: 40,
      phone: 25,
      groceries: { single: 250, married: 400, withKids: 600 },
      transport: {
        single: 50,
        married: 80,
        youngPerson: 20, // under 25 in Madrid gets discount
      },
      dining: { single: 150, married: 250, withKids: 300 },
      entertainment: 100,
      insurance: 80,
      gym: 50,
      savings: 300,
    },
  },
  usa: {
    name: 'USA',
    currency: '$',
    costs: {
      rent: { single: 1200, married: 1600, withKids: 2000 },
      utilities: { single: 150, married: 200, withKids: 250 },
      internet: 60,
      phone: 80,
      groceries: { single: 350, married: 600, withKids: 900 },
      transport: { single: 300, married: 400, withKids: 500 },
      dining: { single: 250, married: 400, withKids: 500 },
      entertainment: 150,
      insurance: 200,
      gym: 60,
      savings: 400,
    },
  },
  australia: {
    name: 'Australia',
    currency: '$',
    costs: {
      rent: { single: 1400, married: 1800, withKids: 2200 },
      utilities: { single: 180, married: 250, withKids: 300 },
      internet: 70,
      phone: 50,
      groceries: { single: 400, married: 700, withKids: 1000 },
      transport: { single: 180, married: 250, withKids: 350 },
      dining: { single: 300, married: 450, withKids: 600 },
      entertainment: 150,
      insurance: 150,
      gym: 80,
      savings: 500,
    },
  },
};

export function calculateBudget(userProfile) {
  const { country, jobStatus, monthlyIncome, age, hasKids, maritalStatus } = userProfile;
  
  const countryInfo = countryData[country];
  if (!countryInfo) throw new Error('Country not supported');

  const costs = countryInfo.costs;
  const householdType = hasKids ? 'withKids' : maritalStatus === 'single' ? 'single' : 'married';

  // Calculate main expenses
  let budget = {
    country: countryInfo.name,
    currency: countryInfo.currency,
    monthlyIncome,
    categories: {
      housing: costs.rent[householdType] || costs.rent.single,
      utilities: costs.utilities[householdType] || costs.utilities.single,
      internet: costs.internet,
      phone: costs.phone,
      groceries: costs.groceries[householdType] || costs.groceries.single,
      transport: getTransportCost(country, age, costs, householdType),
      dining: costs.dining[householdType] || costs.dining.single,
      entertainment: costs.entertainment,
      insurance: costs.insurance,
      gym: costs.gym,
      savings: costs.savings,
    },
  };

  // Calculate totals
  budget.totalExpenses = Object.values(budget.categories).reduce((a, b) => a + b, 0);
  budget.surplus = monthlyIncome - budget.totalExpenses;
  budget.savingsPercentage = ((budget.categories.savings / monthlyIncome) * 100).toFixed(1);

  // Add recommendations
  budget.recommendations = generateRecommendations(budget, userProfile);

  return budget;
}

function getTransportCost(country, age, costs, householdType) {
  if (country === 'spain' && age < 25) {
    return costs.transport.youngPerson || 20;
  }
  return costs.transport[householdType] || costs.transport.single;
}

function generateRecommendations(budget, userProfile) {
  const recommendations = [];

  if (budget.surplus > 500) {
    recommendations.push('💡 You have good surplus! Consider investing or building an emergency fund.');
  } else if (budget.surplus < 0) {
    recommendations.push('⚠️ Your expenses exceed income. Consider reviewing dining or entertainment budget.');
  }

  if (budget.categories.housing > budget.monthlyIncome * 0.35) {
    recommendations.push('🏠 Your housing cost is >35% of income. Consider looking for cheaper accommodation.');
  }

  if (userProfile.hasKids && budget.categories.groceries < 500) {
    recommendations.push('👨‍👩‍👧‍👦 With kids, you might want to increase grocery budget for better nutrition.');
  }

  if (userProfile.jobStatus === 'freelance' && budget.categories.savings < 400) {
    recommendations.push('💼 As freelancer, save more for irregular income months (suggest 15-20% of income).');
  }

  return recommendations;
}
