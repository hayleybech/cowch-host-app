import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomString(length: number, uppercase: boolean, lowercase: boolean, numbers: boolean) {
    let result = '';
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const characters =
        (uppercase ? uppercaseChars : '') + (lowercase ? lowercaseChars : '') + (numbers ? numberChars : '0');
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export function getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

export function getWeightedRandomElement<T extends string>(weights: Record<T, number>): T {
    const totalWeight = Object.values(weights).reduce((acc, weight) => (acc as number) + (weight as number), 0) as number;
    let random = Math.random() * totalWeight;

    for (const [item, weight] of Object.entries(weights)) {
        random -= weight as number;
        if (random <= 0) {
            return item as T;
        }
    }

    return Object.keys(weights)[0] as T;
}
