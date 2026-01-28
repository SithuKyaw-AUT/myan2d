export type DailyResult = {
    date: string;
    morning?: { set: string; value: string; twoD: string };
    evening?: { set: string; value: string; twoD: string };
};
