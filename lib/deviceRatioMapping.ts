export const deviceRatioMapping = {
  "iPhone wallpaper": "9:19.5",
  "Android phone wallpaper": "9:19.5",
  "Desktop wallpaper": "16:9",
  "Laptop wallpaper": "16:10",
  "iPad or tablet wallpaper": "4:3",
  "Lock screen wallpaper": "9:19.5",
  "Home screen wallpaper": "9:19.5",
  "Wide monitor wallpaper": "21:9",
  "Square printable vision board": "1:1",
  "I want both phone and desktop": ["9:19.5", "16:9"],
  "I want custom size": "custom",
} as const;

export type DeviceRatioMappingKey = keyof typeof deviceRatioMapping;
