import pc from 'picocolors';

export function startSpinner(text) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const animateDots = text.endsWith('...');
  const baseText = animateDots ? text.slice(0, -3) : text;
  const dotStates = ['.', '..', '...'];
  let i = 0;

  const renderText = () => (animateDots ? `${baseText}${dotStates[Math.floor(i / 5) % 3]}` : text);

  process.stdout.write(`${frames[0]}  ${renderText()}`);

  const id = setInterval(() => {
    i++;
    process.stdout.write(`\r\x1B[K${pc.cyan(frames[i % frames.length])}  ${renderText()}`);
  }, 80);

  return (doneText, status = 'success') => {
    clearInterval(id);
    const symbol = status === 'success' ? pc.green('✔') : pc.red('✖');
    process.stdout.write(`\r\x1B[K${symbol}  ${doneText}\n`);
  };
}
