// === BASE MULTIPLIERS ===
function getRates(base) {
    return {
        base: base,
        sat: base * 1.5,
        sun: base * 1.75,
        casualLoading: base * 0.25,
        evening: base * 1.5,
        publicHoliday: base * 2.5,
        overtime: base * 1.75
    };
}

// === CALCULATE SHIFT HOURS ===
function calcHours(start, end) {
    const s = new Date(`1970-01-01T${start}:00`);
    const e = new Date(`1970-01-01T${end}:00`);

    let diff = (e - s) / 1000 / 3600;
    if (diff < 0) diff += 24;

    return diff;
}

// === REMOVE BREAK FROM HOURS ===
function applyBreaks(hours) {
    if (hours > 6) return hours - 1;
    if (hours > 5) return hours - 0.5;
    return hours;
}


// === SHIFT PAY WITH EVENING SPLIT ===
function calcShiftPay(day, start, end, rates) {
    // Calculate raw hours and apply break first
    let rawHours = calcHours(start, end);
    let paidHours = applyBreaks(rawHours);

    const s = new Date(`1970-01-01T${start}:00`);
    const e = new Date(`1970-01-01T${end}:00`);
    const eveningStart = new Date(`1970-01-01T18:15:00`);

    let ordinaryHours = 0;
    let eveningHours = 0;

    // Special days
    if (day === "sat") return { pay: paidHours * rates.sat, ordinary: 0, evening: 0 };
    if (day === "sun") return { pay: paidHours * rates.sun, ordinary: 0, evening: 0 };
    if (day === "ph")  return { pay: paidHours * rates.publicHoliday, ordinary: 0, evening: 0 };

    // Weekday split
    const shiftStartHours = (s - s) / 1000 / 3600; // always 0
    let hoursBeforeEvening = (eveningStart - s)/1000/3600;
    if (hoursBeforeEvening < 0) hoursBeforeEvening = 0;

    if (paidHours <= hoursBeforeEvening) {
        // all ordinary
        ordinaryHours = paidHours;
        eveningHours = 0;
    } else {
        eveningHours = paidHours - hoursBeforeEvening;
        ordinaryHours = paidHours - eveningHours;
    }

    const pay = ordinaryHours * rates.base + eveningHours * rates.evening;
    return { pay, ordinary: ordinaryHours, evening: eveningHours };
}



// === OVERTIME ===
function applyOvertime(totalHours, limit, rates) {
    if (totalHours <= limit) {
        return { overtimePay: 0, overtimeHours: 0 };
    }

    const extra = totalHours - limit;
    return {
        overtimePay: extra * rates.overtime,
        overtimeHours: extra
    };
}

// === COMMISSION ===
function calcCommission(sales) {
    let total = 0;
    for (let sale of sales) {
        if (sale >= 300) total += sale * 0.05;
    }
    return total;
}

// === TAX ===
function applyTax(amount, percent) {
    return amount - (amount * (percent / 100));
}

// === MAIN ===
function calcWeek(shifts, baseRate, isCasual, taxPercent, sales) {
    const rates = getRates(baseRate);
    const hourLimit = isCasual ? 35 : 40;
    let ordinaryhours = 0;
    let totalHours = 0;
    let earnings = 0;
    let totalOrdinaryHours = 0;

    for (let shift of shifts) {
        const result = calcShiftPay(shift.day, shift.start, shift.end, rates);
        earnings += result.pay;
        totalOrdinaryHours += result.ordinary;
        totalHours += applyBreaks(calcHours(shift.start, shift.end));
        console.log(shift.day + ": " + earnings);
    }



    const overtime = applyOvertime(totalHours, hourLimit, rates);
    earnings += overtime.overtimePay;
    if (isCasual) {
        earnings += totalOrdinaryHours * rates.casualLoading;
    }
    const commission = calcCommission(sales);
    const gross = earnings + commission;
    const net = applyTax(gross, taxPercent);

    return {
        totalHours,
        totalOrdinaryHours,
        earnings,
        commission,
        gross,
        net,
        overtimeHours: overtime.overtimeHours
    };
}

// === HOOK TO HTML ===
document.getElementById("calcBtn").addEventListener("click", () => {
    const baseRate = parseFloat(document.getElementById("baseRate").value);
    const taxPercent = parseFloat(document.getElementById("taxPercent").value);
    const empType = document.getElementById("empType").value;

    const isCasual = (empType === "casual");

    // Commission sales input
    const salesRaw = document.getElementById("salesInput").value;
    const sales = salesRaw
        .split(",")
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));

    // Grab shifts
    const shiftDivs = document.querySelectorAll(".shift");
    const shifts = [];

    shiftDivs.forEach(div => {
        const day = div.querySelector(".day").value;
        const start = div.querySelector(".start").value;
        const end = div.querySelector(".end").value;

        if (start && end) {
            shifts.push({ day, start, end });
        }
    });

    const result = calcWeek(shifts, baseRate, isCasual, taxPercent, sales);

    document.getElementById("results").innerHTML = `
        Total Hours: ${result.totalHours.toFixed(2)}<br>
        Ordinary Hours: ${result.totalOrdinaryHours.toFixed(2)}<br>
        Base + Penalties: $${result.earnings.toFixed(2)}<br>
        Commission: $${result.commission.toFixed(2)}<br>
        Gross: $${result.gross.toFixed(2)}<br>
        Net (after tax): $${result.net.toFixed(2)}<br>
        Overtime Hours: ${result.overtimeHours.toFixed(2)}
    `;


});
