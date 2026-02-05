export function formatDateToYyyyMmDd(date: Date): string {
    const d = new Date(date);
    let day = '' + d.getDate();
    let month = '' + (d.getMonth() + 1);
    const year = d.getFullYear();

    if (day.length < 2) 
        day = '0' + day;
    if (month.length < 2) 
        month = '0' + month;

    return [year, month, day].join('-');
}

export function getMondayOfCurrentWeek(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday - 0, Monday - 1, ...
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(today.setDate(diff));
}
