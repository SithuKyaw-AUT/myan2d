export type Result = {
    set: string;
    value: string;
    twoD: string;
};

export type DailyResult = {
    id?: string;
    date: string;
    s11_00?: Result | null;
    s12_01?: Result | null;
    s15_00?: Result | null;
    s16_30?: Result | null;
};
