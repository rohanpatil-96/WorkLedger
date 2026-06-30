export interface LocationSuggestions {
  country: string;
  capital: string;
  majorCities: string[];
  defaultDistanceKm: number;
  currency: string;
}

const DEFAULT_SUGGESTIONS: LocationSuggestions = {
  country: 'Denmark',
  capital: 'Copenhagen',
  majorCities: ['Aarhus', 'Odense', 'Aalborg', 'Esbjerg'],
  defaultDistanceKm: 38,
  currency: 'DKK'
};

const COUNTRY_MAP: Record<string, LocationSuggestions> = {
  DK: DEFAULT_SUGGESTIONS,
  DE: {
    country: 'Germany',
    capital: 'Berlin',
    majorCities: ['Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart'],
    defaultDistanceKm: 30,
    currency: 'EUR'
  },
  GB: {
    country: 'United Kingdom',
    capital: 'London',
    majorCities: ['Birmingham', 'Manchester', 'Glasgow', 'Leeds', 'Edinburgh'],
    defaultDistanceKm: 42,
    currency: 'GBP'
  },
  US: {
    country: 'United States',
    capital: 'Washington D.C.',
    majorCities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Boston'],
    defaultDistanceKm: 50,
    currency: 'USD'
  },
  FR: {
    country: 'France',
    capital: 'Paris',
    majorCities: ['Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes'],
    defaultDistanceKm: 32,
    currency: 'EUR'
  },
  IN: {
    country: 'India',
    capital: 'New Delhi',
    majorCities: ['Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune'],
    defaultDistanceKm: 25,
    currency: 'INR'
  },
  SE: {
    country: 'Sweden',
    capital: 'Stockholm',
    majorCities: ['Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro'],
    defaultDistanceKm: 35,
    currency: 'SEK'
  },
  NO: {
    country: 'Norway',
    capital: 'Oslo',
    majorCities: ['Bergen', 'Trondheim', 'Stavanger', 'Sandnes', 'Tromsø'],
    defaultDistanceKm: 40,
    currency: 'NOK'
  },
  NL: {
    country: 'Netherlands',
    capital: 'Amsterdam',
    majorCities: ['Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen'],
    defaultDistanceKm: 36,
    currency: 'EUR'
  },
  BE: {
    country: 'Belgium',
    capital: 'Brussels',
    majorCities: ['Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges'],
    defaultDistanceKm: 28,
    currency: 'EUR'
  },
  IT: {
    country: 'Italy',
    capital: 'Rome',
    majorCities: ['Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Florence'],
    defaultDistanceKm: 34,
    currency: 'EUR'
  },
  ES: {
    country: 'Spain',
    capital: 'Madrid',
    majorCities: ['Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga'],
    defaultDistanceKm: 35,
    currency: 'EUR'
  },
  CH: {
    country: 'Switzerland',
    capital: 'Bern',
    majorCities: ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Winterthur'],
    defaultDistanceKm: 26,
    currency: 'CHF'
  },
  AT: {
    country: 'Austria',
    capital: 'Vienna',
    majorCities: ['Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt'],
    defaultDistanceKm: 32,
    currency: 'EUR'
  },
  FI: {
    country: 'Finland',
    capital: 'Helsinki',
    majorCities: ['Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku'],
    defaultDistanceKm: 38,
    currency: 'EUR'
  }
};

const TIMEZONE_COUNTRY_MAP: Record<string, string> = {
  'Europe/Copenhagen': 'DK',
  'Europe/Berlin': 'DE',
  'Europe/Busingen': 'DE',
  'Europe/London': 'GB',
  'Europe/Belfast': 'GB',
  'Europe/Paris': 'FR',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT',
  'Europe/Helsinki': 'FI',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Adak': 'US',
  'Pacific/Honolulu': 'US'
};

export function detectDeviceLocation(): LocationSuggestions {
  try {
    // 1. Detect from Timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      const countryCode = TIMEZONE_COUNTRY_MAP[tz];
      if (countryCode && COUNTRY_MAP[countryCode]) {
        return COUNTRY_MAP[countryCode];
      }
      
      // Fuzzy match timezone path (e.g., Europe/Copenhagen)
      for (const [key, code] of Object.entries(TIMEZONE_COUNTRY_MAP)) {
        if (tz.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(tz.toLowerCase())) {
          return COUNTRY_MAP[code];
        }
      }
    }

    // 2. Detect from Languages/Navigator Locale
    const languages = navigator.languages || [navigator.language];
    for (const lang of languages) {
      if (!lang) continue;
      const parts = lang.split('-');
      if (parts.length > 1) {
        const code = parts[1].toUpperCase();
        if (COUNTRY_MAP[code]) {
          return COUNTRY_MAP[code];
        }
      }
    }
  } catch (e) {
    console.warn('Error detecting device location/timezone, fallback to Denmark suggestions:', e);
  }

  // Default fallback
  return DEFAULT_SUGGESTIONS;
}
