import {estimate} from './estimator-math.mjs?v=2';

const $=id=>document.getElementById(id);
const form=$('withholding-form');
const results=$('withholding-results');
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

const fieldHelp={
 status:'Choose the filing status you expect to use for this tax year.',
 'ytd-pay':'Enter the YTD Gross or YTD Total Earnings amount from your latest paystub. Use $0 if you have not been paid yet this year.',
 'ytd-withheld':'Enter the YTD Federal Income Tax or FIT amount from your paystub. Leave out Social Security, Medicare, and state tax.',
 'check-pay':'Enter gross earnings for one regular paycheck, before taxes and deductions. Do not use take-home pay.',
 'check-withheld':'Enter only Federal Income Tax or FIT taken from one regular paycheck. Leave out Social Security, Medicare, and state tax.',
 'ytd-pretax-401k':'Enter the year-to-date traditional pre-tax 401(k) deduction from your paystub, or enter $0.',
 'check-pretax-401k':'Enter the traditional pre-tax 401(k) deduction from one regular paycheck, or enter $0. Do not include Roth contributions.',
 'ytd-pretax-health':'Enter the year-to-date employee health premium deducted before federal tax, or enter $0. Do not use W-2 Box 12 code DD.',
 'check-pretax-health':'Enter the employee health premium deducted before federal tax from one regular paycheck, or enter $0.',
 'checks-left':'Enter a whole number from 0 to 52. Count the regular paychecks you expect before December 31.',
 'business-receipts':'Enter total side-work income before expenses from your income records, 1099-NEC Box 1, or gig-platform records. Do not count the same income twice.',
 'business-expenses':'Enter business expenses supported by your records. Do not include personal purchases, and do not enter more than your business income in this simplified estimate.',
 'estimated-payments':'Enter federal estimated payments shown in your IRS payment confirmations or bank records. Use $0 if you made none.',
 ctc:'Enter a whole number from 0 to 10. Count only children you expect to meet the Child Tax Credit rules; use 0 if unsure.',
 'eitc-children':'Enter a whole number from 0 to 3. Count only children you expect to meet the EITC rules; use 0 if none.',
 'tips-total':'Enter the tips you expect for the full year from your paystub tip totals, or $0 if none.',
 'overtime-total':'Enter your total overtime pay for the full year from the Overtime or OT line on your paystub, or $0 if none.',
 seniors:'Enter 0, 1, or 2. Count only people on this return who will be 65 or older by December 31, 2026.',
 'spouse-ytd-pay':'Enter your spouse’s YTD gross pay minus pre-tax deductions, or leave blank if your spouse does not work.',
 'spouse-ytd-withheld':'Enter the YTD federal income tax from your spouse’s paystub, or leave blank.',
 'spouse-check-pay':'Enter one regular check’s gross pay minus pre-tax deductions from your spouse’s paystub.',
 'spouse-check-withheld':'Enter federal income tax from one of your spouse’s regular checks.',
 'spouse-checks-left':'Enter a whole number from 0 to 52 for your spouse’s remaining paychecks this year.'
};

const fieldErrors=new Map();
for(const [id] of Object.entries(fieldHelp)){
 const input=$(id);
 if(!input) continue;
 const error=document.createElement('p');
 error.id=id+'-error';
 error.className='field-error';
 error.setAttribute('aria-live','polite');
 error.hidden=true;
 input.insertAdjacentElement('afterend',error);
 const described=[];
 const helper=input.nextElementSibling?.classList.contains('helper')?input.nextElementSibling:null;
 if(helper){if(!helper.id)helper.id=id+'-help';described.push(helper.id);}
 described.push(error.id);
 input.setAttribute('aria-describedby',described.join(' '));
 fieldErrors.set(id,error);
}
const choices=$('include-w2').closest('.choices');
const choiceError=document.createElement('p');
choiceError.id='income-choice-error';
choiceError.className='field-error';
choiceError.setAttribute('aria-live','polite');
choiceError.hidden=true;
choices.insertAdjacentElement('afterend',choiceError);
$('include-w2').setAttribute('aria-describedby',choiceError.id);
$('include-1099').setAttribute('aria-describedby',choiceError.id);

function clearErrors(){
 for(const [id,error] of fieldErrors){error.textContent='';error.hidden=true;$(id).removeAttribute('aria-invalid');}
 choiceError.textContent='';choiceError.hidden=true;
 $('withholding-error').textContent='';
}
function showFieldError(id,message){
 const error=fieldErrors.get(id);if(!error)return;
 error.textContent=message;error.hidden=false;$(id).setAttribute('aria-invalid','true');
}
function toggleIncomeFields(){
 $('w2-fields').hidden=!$('include-w2').checked;
 $('business-fields').hidden=!$('include-1099').checked;
 clearErrors();
}
$('include-w2').addEventListener('change',toggleIncomeFields);
$('include-1099').addEventListener('change',toggleIncomeFields);
function toggleSpouse(){const joint=$('status').value==='joint'&&$('include-w2').checked;$('spouse-fields').hidden=!joint;}
$('status').addEventListener('change',toggleSpouse);
$('include-w2').addEventListener('change',toggleSpouse);
toggleIncomeFields();toggleSpouse();

function readAmount(id,{required=false,whole=false,max=150000}={}){
 const el=$(id),raw=el.value.trim();
 if(raw===''&&!required)return 0;
 if(raw===''||!Number.isFinite(Number(raw))){showFieldError(id,fieldHelp[id]);return null;}
 const n=Number(raw);
 if(n<0||n>max||!Number.isFinite(n)){showFieldError(id,`Enter an amount from $0 to $${max.toLocaleString('en-US')}. Check the amount on your paystub or records.`);return null;}
 if(whole&&!Number.isInteger(n)){showFieldError(id,'Enter a whole number with no decimals.');return null;}
 return n;
}
function makeCard(el,kind,label,value,detail){
 el.className='amount-card '+kind;el.replaceChildren();
 const title=document.createElement('span');title.className='amount-label';title.textContent=label;
 const amount=document.createElement('strong');amount.className='amount-value';amount.textContent=value;
 const note=document.createElement('span');note.className='amount-detail';note.textContent=detail;
 el.append(title,amount,note);
}

form.addEventListener('submit',event=>{
 event.preventDefault();clearErrors();
 const status=$('status').value,hasW2=$('include-w2').checked,hasBusiness=$('include-1099').checked;
 let hasError=false;
 if(!status){showFieldError('status',fieldHelp.status);hasError=true;}
 if(!hasW2&&!hasBusiness){choiceError.textContent='Select W-2 wages, 1099/self-employment income, or both so the estimator knows which income to include.';choiceError.hidden=false;hasError=true;}
 const data={};
 if(hasW2){
  for(const [id,options] of [['ytd-pay',{required:true}],['ytd-withheld',{required:true}],['check-pay',{required:true}],['check-withheld',{required:true}],['ytd-pretax-401k',{}],['check-pretax-401k',{}],['ytd-pretax-health',{}],['check-pretax-health',{}],['checks-left',{required:true,whole:true,max:52}]]){
   data[id]=readAmount(id,options);if(data[id]===null)hasError=true;
  }
 }
 if(hasBusiness){
  for(const [id,options] of [['business-receipts',{}],['business-expenses',{}],['estimated-payments',{}]]){data[id]=readAmount(id,options);if(data[id]===null)hasError=true;}
 }
 let spouse=null;
 if(hasW2&&status==='joint'){
  const sp={};for(const [id,options] of [['spouse-ytd-pay',{}],['spouse-ytd-withheld',{}],['spouse-check-pay',{}],['spouse-check-withheld',{}],['spouse-checks-left',{whole:true,max:52}]]){sp[id]=readAmount(id,options);if(sp[id]===null)hasError=true;}
  if(!hasError&&(sp['spouse-ytd-pay']>0||sp['spouse-check-pay']>0)){
   if($('spouse-checks-left').value.trim()===''){showFieldError('spouse-checks-left','Enter how many regular paychecks your spouse has left this year, or 0 if none.');hasError=true;$('spouse-fields').open=true;}
   spouse=sp;
  }
  if(hasError)$('spouse-fields').open=true;
 }
 data.tips=readAmount('tips-total');
 data.overtime=readAmount('overtime-total');
 data.seniors=readAmount('seniors',{whole:true,max:status==='joint'?2:1});
 if(data.tips===null||data.overtime===null||data.seniors===null){hasError=true;$('new-deductions').open=true;}
 data.ctc=readAmount('ctc',{whole:true,max:10});
 data['eitc-children']=readAmount('eitc-children',{whole:true,max:3});
 if(data.ctc===null||data['eitc-children']===null){hasError=true;$('ctc').closest('details').open=true;}
 if(hasW2&&!hasError){
  if(data['ytd-pretax-401k']+data['ytd-pretax-health']>data['ytd-pay']){
   showFieldError('ytd-pay','Your year-to-date pre-tax deductions are higher than the gross pay entered. Compare both YTD amounts on your paystub and correct the totals.');
   showFieldError('ytd-pretax-401k','Check this YTD deduction against your paystub and the year-to-date gross pay above.');
   showFieldError('ytd-pretax-health','Check this YTD premium against your paystub and the year-to-date gross pay above.');hasError=true;
  }
  if(data['check-pretax-401k']+data['check-pretax-health']>data['check-pay']){
   showFieldError('check-pay','The pre-tax deductions entered are higher than gross pay for one check. Compare the amounts on the same paystub and correct them.');
   showFieldError('check-pretax-401k','Check this per-check deduction against the gross pay and health premium from the same paycheck.');
   showFieldError('check-pretax-health','Check this per-check premium against the gross pay and 401(k) deduction from the same paycheck.');hasError=true;
  }
 }
 if(!hasError){
  const w2Gross=(hasW2?data['ytd-pay']+data['check-pay']*data['checks-left']:0)+(spouse?spouse['spouse-ytd-pay']+spouse['spouse-check-pay']*(spouse['spouse-checks-left']||0):0);
  const allIncome=w2Gross+(hasBusiness?data['business-receipts']:0);
  if(data.overtime>w2Gross){showFieldError('overtime-total','Overtime pay is higher than the projected W-2 pay entered. Overtime should already be included in your gross pay; check both amounts on your paystub.');$('new-deductions').open=true;hasError=true;}
  if(data.tips>allIncome){showFieldError('tips-total','Tips are higher than the total income entered. Tips should already be included in your pay or 1099 income; check both amounts.');$('new-deductions').open=true;hasError=true;}
 }
 if(hasBusiness&&!hasError&&data['business-expenses']>data['business-receipts']){
  showFieldError('business-expenses','Expenses are greater than the business income entered. Check your records and enter supported business expenses; this simplified estimator cannot calculate a business loss.');hasError=true;
 }
 if(hasError){
  $('withholding-error').textContent='Please review the highlighted fields. Each message explains what to check or enter.';
  const first=form.querySelector('[aria-invalid="true"]')||choices.querySelector('input');
  first?.focus();first?.scrollIntoView({behavior:'smooth',block:'center'});return;
 }
 try{
  const grossPay=hasW2?data['ytd-pay']+data['check-pay']*data['checks-left']:0;
  const pretax401k=hasW2?data['ytd-pretax-401k']+data['check-pretax-401k']*data['checks-left']:0;
  const pretaxHealth=hasW2?data['ytd-pretax-health']+data['check-pretax-health']*data['checks-left']:0;
  const pretaxDeductions=pretax401k+pretaxHealth;
  const spouseLeft=spouse?(spouse['spouse-checks-left']||0):0;
  const spouseWages=spouse?spouse['spouse-ytd-pay']+spouse['spouse-check-pay']*spouseLeft:0;
  const spouseWithheld=spouse?spouse['spouse-ytd-withheld']+spouse['spouse-check-withheld']*spouseLeft:0;
  const wages=Math.max(0,grossPay-pretaxDeductions)+spouseWages;
  const withholding=(hasW2?data['ytd-withheld']+data['check-withheld']*data['checks-left']:0)+spouseWithheld;
  const receipts=hasBusiness?data['business-receipts']:0;
  const expenses=hasBusiness?data['business-expenses']:0;
  const estimatedPayments=hasBusiness?data['estimated-payments']:0;
  const eitcEligible=$('eitc-eligible').checked;
  const eitcChildren=eitcEligible?data['eitc-children']:0;
  const r=estimate({status,wages,receipts,expenses,withholding,payments:estimatedPayments,ctc:data.ctc,eitcChildren,eitcEligible,tips:data.tips,overtimePremium:data.overtime/3,seniors:data.seniors});
  const due=Math.max(0,-r.balance),refund=Math.max(0,r.balance);
  const ownLeft=hasW2?data['checks-left']:0;
  const useSpouse=ownLeft===0&&spouseLeft>0;
  const remaining=useSpouse?spouseLeft:ownLeft;
  const extra=remaining>0?Math.ceil(due/remaining):0;
  const whose=useSpouse?'your spouse’s':'your';
  $('withholding-result-title').textContent='Your estimate at a glance';
  if(due>0)makeCard($('withholding-total'),'is-due','Estimated amount you may owe',money(due),'Projected federal balance after the payments and credits you entered.');
  else makeCard($('withholding-total'),'is-refund','Estimated federal refund',money(refund),'Based on the amounts and credits you entered. Your actual refund may differ.');
  if(due>0&&hasW2&&remaining>0)makeCard($('withholding-extra'),'is-extra','Extra federal tax to add to each remaining paycheck',money(extra),'Spreads the estimated balance across '+remaining+' remaining '+(useSpouse?'checks from your spouse’s job.':'checks.'));
  else if(due>0)makeCard($('withholding-extra'),'is-extra','Estimated amount to cover',money(due),'No W-2 paychecks remain in this estimate. Review estimated tax payment options, such as IRS Form 1040-ES.');
  else makeCard($('withholding-extra'),'is-extra','Extra federal tax to request from each paycheck',money(0),'No additional withholding is suggested by this estimate. This is not a guarantee.');
  const next=$('withholding-next');next.replaceChildren();
  const nt=document.createElement('strong');const np=document.createElement('p');np.style.margin='0';
  const link=(href,text)=>{const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=text;return a;};
  if(due>0&&hasW2&&remaining>0){
   nt.textContent='Your next step';
   np.append('Fill out a new ',link('https://www.irs.gov/pub/irs-pdf/fw4.pdf','Form W-4'),', write '+money(extra)+' on Step 4(c) “Extra withholding,” and give it to '+whose+' employer’s payroll or HR department. Keep the rest of the form the same as '+whose+' current W-4. Check '+whose+' next paystub to make sure the extra federal tax is being taken out.');
  }else if(due>0){
   nt.textContent='Your next step';
   np.append('Make an estimated tax payment of about '+money(due)+' by January 15, 2027 using ',link('https://www.irs.gov/payments/direct-pay','IRS Direct Pay'),'. Choose “Estimated Tax” and “1040-ES” for tax year 2026, and keep the confirmation number for your tax preparer.');
  }else{
   nt.textContent='Your next step';
   np.append('No change needed right now. Keep your current W-4, and run this estimate again if your pay, hours, or family situation changes.');
  }
  next.append(nt,np);
  const lines=[];
  if(spouse)lines.push(['Spouse’s projected 2026 pay after pre-tax deductions',spouseWages],['Spouse’s projected federal withholding if unchanged',spouseWithheld]);
  if(hasW2)lines.push(['Projected 2026 W-2 gross pay',grossPay],['Projected traditional 401(k) pre-tax contributions',pretax401k],['Projected pre-tax health insurance premiums',pretaxHealth],[spouse?'Combined W-2 federal taxable wages (you + spouse)':'Estimated W-2 federal taxable wages after entered deductions',wages],[spouse?'Combined federal withholding if unchanged (you + spouse)':'Projected W-2 federal income tax withholding if unchanged',withholding]);
  if(hasBusiness)lines.push(['Estimated 1099/self-employment gross receipts',receipts],['Estimated business expenses',expenses],['Estimated net business profit',r.profit],['Estimated self-employment tax',r.se],['Federal estimated tax payments entered',estimatedPayments]);
  lines.push(['2026 standard deduction',r.deduction]);
  if(r.tipsDed>0)lines.push(['No-tax-on-tips deduction',r.tipsDed]);
  if(r.overtimeDed>0)lines.push(['Overtime deduction (extra half of time-and-a-half)',r.overtimeDed]);
  if(r.seniorDed>0)lines.push(['Age 65+ deduction',r.seniorDed]);
  if(r.qbi>0)lines.push(['Qualified business income deduction (20%)',r.qbi]);
  lines.push(['Estimated taxable income',r.taxable]);
  lines.push(['Estimated federal tax after modeled credits',r.totalTax],['Estimated refundable credits',r.refundable],['Estimated projected refund or amount due',r.balance]);
  const dl=$('withholding-breakdown');dl.replaceChildren();
  for(const [label,n] of lines){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=money(n);dl.append(dt,dd);}
  results.hidden=false;form.hidden=true;try{if(!location.search.includes('estimate=done'))history.pushState({},'',location.pathname+'?estimate=done');}catch(e){}results.focus();results.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){
  const message=error.message||'We could not calculate this estimate.';
  if(message.includes('total wages plus business receipts')){
   const limitMessage='Combined W-2 wages and 1099 income are above this simplified estimator’s $150,000 limit. Check both income entries; for a higher-income situation, use the official IRS estimator or get individual tax help.';
   if(hasW2)showFieldError('ytd-pay',limitMessage);
   if(hasBusiness)showFieldError('business-receipts',limitMessage);
   $('withholding-error').textContent='This income is outside the estimator’s range. Review the highlighted fields or use the official IRS estimator.';
  }else if(message.includes('Business losses')){
   showFieldError('business-expenses','Your expenses are higher than your income. This simplified estimator cannot calculate a business loss; check your records or use the official IRS estimator.');
   $('withholding-error').textContent='The business expense amount needs review.';
  }else{
   $('withholding-error').textContent='We could not calculate this estimate. Check the highlighted income and payment amounts, then try again.';
  }
 }
});

$('withholding-reset').addEventListener('click',()=>{
 form.reset();toggleIncomeFields();toggleSpouse();try{history.replaceState({},'',location.pathname);}catch(e){}results.hidden=true;form.hidden=false;clearErrors();$('status').focus();
});
