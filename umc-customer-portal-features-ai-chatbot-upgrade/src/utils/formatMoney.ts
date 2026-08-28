const formatMoney = (num?: Number | string) => {
  if(!num) return '0.00';
  if (typeof num !== 'number' && typeof num !== 'string') return num;
  const str =  Number(num).toFixed(2).toString().trim();
  if (!str || isNaN(Number(str))) return num;
  const [integerPart, decimalPart] = str.split('.');
  const formattedInteger = Math.abs(Number(integerPart)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

export default formatMoney;