// Federal 2026, limited ordinary-income model, incl. tips/overtime/senior and QBI deductions. All amounts are annual USD.
export function estimate(x){
 const values=['wages','receipts','expenses','withholding','payments'];
 if(!['single','joint','hoh'].includes(x.status)||values.some(k=>!Number.isFinite(x[k])||x[k]<0)||!Number.isInteger(x.ctc)||x.ctc<0||x.ctc>10||!Number.isInteger(x.eitcChildren)||x.eitcChildren<0||x.eitcChildren>3)throw Error('Please enter valid, nonnegative amounts and whole-number child counts.');
 if(x.wages+x.receipts>150000)throw Error('This simplified tool supports total wages plus business receipts up to $150,000. Join the waitlist for a personal review of your income.');
 if(x.expenses>x.receipts)throw Error('Business losses need a personal review. Expenses cannot exceed receipts in this simplified tool.');
 const profit=x.receipts-x.expenses, netSE=profit*.9235;
 const se=netSE>=400?netSE*.153:0;
 const adjustment=se/2, agi=x.wages+profit-adjustment, earned=agi;
 const deduction={single:16100,joint:32200,hoh:24150}[x.status];
 // 2025-2028 deductions (One Big Beautiful Bill Act). Inputs are optional; MAGI phase-outs start at $150,000 ($300,000 joint) for tips/overtime, which this tool's $150,000 cap never reaches.
 const num=v=>Number.isFinite(v)&&v>0?v:0;
 const tipsDed=Math.min(num(x.tips),25000);
 const overtimeDed=Math.min(num(x.overtimePremium),x.status==='joint'?25000:12500);
 const seniors=Math.min(Math.max(0,Math.floor(num(x.seniors))),x.status==='joint'?2:1);
 const seniorDed=seniors*Math.max(0,6000-.06*Math.max(0,agi-(x.status==='joint'?150000:75000)));
 const beforeQBI=Math.max(0,agi-deduction-tipsDed-overtimeDed-seniorDed);
 // Qualified business income deduction (20%), below the 2026 threshold; $400 minimum with at least $1,000 of QBI.
 const qbiBase=Math.max(0,profit-adjustment);
 let qbi=Math.min(.2*qbiBase,.2*beforeQBI);
 if(qbiBase>=1000)qbi=Math.min(Math.max(qbi,400),beforeQBI);
 const taxable=Math.max(0,beforeQBI-qbi);
 const limits={single:[12400,50400,105700,201775,256225,640600,Infinity],joint:[24800,100800,211400,403550,512450,768700,Infinity],hoh:[17700,67450,105700,201750,256200,640600,Infinity]}[x.status];
 const rates=[.10,.12,.22,.24,.32,.35,.37];let incomeTax=0,prior=0;
 limits.forEach((top,i)=>{incomeTax+=Math.max(0,Math.min(taxable,top)-prior)*rates[i];prior=top;});
 const n=x.eitcChildren,max=[664,4427,7316,8231][n],phaseIn=[.0765,.34,.4,.45][n],phaseOut=[.0765,.1598,.2106,.2106][n];
 const threshold=x.status==='joint'?(n?31160:18140):(n?23890:10860);
 const end=x.status==='joint'?[26820,58863,65899,70244][n]:[19540,51593,58629,62974][n];
 const eitc=x.eitcEligible&&earned<end?Math.max(0,Math.min(max,earned*phaseIn)-Math.max(0,Math.max(earned,agi)-threshold)*phaseOut):0;
 const creditPool=x.ctc*2200,ctcUsed=Math.min(creditPool,incomeTax);
 const earnedACTC=Math.max(0,earned-2500)*.15;
 const alternative=x.ctc>=3?Math.max(0,x.wages*.0765+se/2-eitc):0;
 const actc=Math.min(Math.max(0,creditPool-ctcUsed),x.ctc*1700,Math.max(earnedACTC,alternative));
 const totalTax=Math.max(0,incomeTax-ctcUsed)+se;
 const refundable=actc+eitc,payments=x.withholding+x.payments;
 return {profit,se,adjustment,agi,deduction,tipsDed,overtimeDed,seniorDed,qbi,taxable,incomeTax,ctcUsed,actc,eitc,totalTax,payments,refundable,balance:payments+refundable-totalTax};
}
