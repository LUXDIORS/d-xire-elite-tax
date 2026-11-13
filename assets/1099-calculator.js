import {estimate} from './estimator-math.mjs?v=2';

const $=id=>document.getElementById(id);
const form=$('calc-form'), results=$('calc-results');
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const num=id=>{const v=$(id).value.trim();return v===''?NaN:Number(v);};

function inputs(){
 const status=$('status').value;
 if(!status)throw Error('Please choose your expected filing status.');
 const x={status,receipts:num('receipts'),expenses:num('expenses'),wages:num('wages'),withholding:num('withholding'),payments:num('payments'),ctc:0,eitcChildren:0,eitcEligible:false};
 if(!Number.isFinite(x.receipts)||x.receipts<=0)throw Error('Enter your 2026 1099 / self-employment income (more than $0).');
 for(const k of ['expenses','wages','withholding','payments'])if(!Number.isFinite(x[k])||x[k]<0)throw Error('Enter $0 or more in each box. Use 0 if none.');
 return x;
}

form.addEventListener('submit',e=>{
 e.preventDefault();$('calc-error').textContent='';
 let x,full,base;
 try{x=inputs();full=estimate(x);base=estimate({...x,receipts:0,expenses:0});}
 catch(err){$('calc-error').textContent=err.message;return;}
 const tax1099=Math.max(0,full.totalTax-base.totalTax);
 const pct=full.profit>0?tax1099/full.profit:0;
 $('setaside-pct').textContent=Math.round(pct*100)+'%';
 $('setaside-line').textContent=full.profit>0
  ?`That's about ${money(pct*1000)} of every $1,000 of profit. Your 2026 profit after expenses is ${money(full.profit)}.`
  :'Your expenses equal your income, so there is no profit to tax in this estimate.';
 $('tax-1099').textContent=money(tax1099);
 const owe=full.balance<0;
 $('balance-label').textContent=owe?'Estimated balance due for 2026':'Estimated refund for 2026';
 $('balance').textContent=money(Math.abs(full.balance));
 const quarterly=Math.max(0,full.totalTax-x.withholding)/4;
 const next=$('next-step');next.replaceChildren();
 const p1=document.createElement('p'),p2=document.createElement('p');
 if(owe){
  p1.innerHTML='<strong>Your next step:</strong> pay about '+money(-full.balance)+' by <strong>January 15, 2027</strong> to cover the rest of your 2026 tax. Use <a href="https://www.irs.gov/payments/direct-pay">IRS Direct Pay</a>: choose "Estimated Tax," then "1040-ES," then tax year 2026. Save the confirmation number.';
 }else{
  p1.innerHTML='<strong>Your next step:</strong> your withholding and payments look like they cover your 2026 federal tax in this estimate. Keep your records and receipts together for tax season.';
 }
 p2.textContent=quarterly>0?`Planning for 2027? If your income stays about the same, plan on estimated payments of about ${money(quarterly)} each on April 15, June 15 and September 15, 2027, and in January 2028.`:'';
 next.append(p1);if(p2.textContent)next.append(p2);
 const lines=[['1099 income',x.receipts],['Business expenses',-x.expenses],['Business profit',full.profit],['Self-employment tax (15.3% of 92.35% of profit)',full.se],['W-2 wages',x.wages],['Half of self-employment tax subtracted from income',-full.adjustment],['Standard deduction',-full.deduction],['Qualified business income deduction (20%)',-full.qbi],['Taxable income',full.taxable],['Federal income tax',full.incomeTax],['Total federal tax (income tax + self-employment tax)',full.totalTax],['W-2 withholding and estimated payments',full.payments]];
 const dl=$('calc-breakdown');dl.replaceChildren();
 for(const [label,n] of lines){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=(n<0?'−':'')+money(Math.abs(n));dl.append(dt,dd);}
 results.hidden=false;results.focus();results.scrollIntoView({behavior:'smooth',block:'start'});
 try{history.pushState(null,'','?estimate=done');}catch{}
});
$('calc-again').addEventListener('click',()=>{results.hidden=true;try{history.replaceState(null,'',location.pathname);}catch{}$('receipts').focus();});
