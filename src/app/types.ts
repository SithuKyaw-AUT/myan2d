export type Result = {
    set: string;
    value: string;
    twoD: string;
};

export type DailyResult = {
    date: string;
    s11_00?: Result;
    s12_01?: Result;
    s15_00?: Result;
    s16_30?: Result;
};
