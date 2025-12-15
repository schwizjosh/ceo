export const COMMON_TIMEZONES = [
  { value: 'Africa/Lagos', label: 'Lagos, Nigeria (WAT)', offset: '+01:00' },
  { value: 'Africa/Accra', label: 'Accra, Ghana (GMT)', offset: '+00:00' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg, South Africa (SAST)', offset: '+02:00' },
  { value: 'Africa/Cairo', label: 'Cairo, Egypt (EET)', offset: '+02:00' },
  { value: 'Africa/Nairobi', label: 'Nairobi, Kenya (EAT)', offset: '+03:00' },
  { value: 'Europe/London', label: 'London, UK (GMT/BST)', offset: '+00:00/+01:00' },
  { value: 'Europe/Paris', label: 'Paris, France (CET)', offset: '+01:00/+02:00' },
  { value: 'Europe/Berlin', label: 'Berlin, Germany (CET)', offset: '+01:00/+02:00' },
  { value: 'America/New_York', label: 'New York, USA (EST/EDT)', offset: '-05:00/-04:00' },
  { value: 'America/Chicago', label: 'Chicago, USA (CST/CDT)', offset: '-06:00/-05:00' },
  { value: 'America/Denver', label: 'Denver, USA (MST/MDT)', offset: '-07:00/-06:00' },
  { value: 'America/Los_Angeles', label: 'Los Angeles, USA (PST/PDT)', offset: '-08:00/-07:00' },
  { value: 'America/Toronto', label: 'Toronto, Canada (EST/EDT)', offset: '-05:00/-04:00' },
  { value: 'Asia/Dubai', label: 'Dubai, UAE (GST)', offset: '+04:00' },
  { value: 'Asia/Kolkata', label: 'Mumbai/Kolkata, India (IST)', offset: '+05:30' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Japan (JST)', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: 'Shanghai, China (CST)', offset: '+08:00' },
  { value: 'Australia/Sydney', label: 'Sydney, Australia (AEDT/AEST)', offset: '+10:00/+11:00' },
  { value: 'Pacific/Auckland', label: 'Auckland, New Zealand (NZDT/NZST)', offset: '+12:00/+13:00' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' }
];

export const getTimezoneLabel = (timezone?: string): string => {
  if (!timezone) return 'Not set';

  const tz = COMMON_TIMEZONES.find(t => t.value === timezone);
  return tz ? tz.label : timezone;
};
