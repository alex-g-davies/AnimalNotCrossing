// Messages shown at the end of every game. Edit freely: these are the words
// she will read. Keep each one short enough to fit on a phone screen.
//
// `{animal}` is replaced with the chosen animal's name, `{animals}` with its plural.

export const WIN_MESSAGES = [
  'You did it. Every {animal} is home, and so is my heart.',
  'Solved! You make hard things look easy, and you make my days easy too.',
  'Brilliant. The {animals} are all settled, and I am all yours.',
  'Another one down. I love watching your mind work.',
  'Perfect. Like you.',
  'The {animals} say thank you. I say I love you.',
  'You found every one. You always find a way; it is one of my favourite things about you.',
  'Clean solve. Clever, patient, lovely: that is you.',
  'Done and dusted. Take a breath, you earned it.',
  'All settled. Hope the rest of your day is this satisfying.',
  'That was quick! Or was it? Either way, I am proud of you.',
  'Every {animal} in its place. Come here, you.',
  'Solved with style. You are my favourite puzzle too.',
  'Nice work. Thinking of you, always.',
  'You and logic: a love story. You and me: the sequel.',
  // The cheeky ones (about a third of the pool). Edit to taste.
  'Nice tots, g. Also, nice solve.',
  'Solved. And, for the record, you have an absolute dumptruck.',
  'Big brain, great legs, mine. Every {animal} is home.',
  'Clean solve. Now walk away slowly so I can watch.',
  'Puzzle: handled. Thighs: unreasonable. Carry on.',
  'All {animals} home. Now bring that body over here.',
  'Solved. The {animals} are impressed. I am mostly looking at your cake.',
];

export const LOSS_MESSAGES = [
  'This one got away. The {animals} forgive you, and I adore you.',
  'Not this time, but there is always another board, and always me.',
  'Tricky one. Shake it off; the next one is yours.',
  'The {animals} scattered, but you are still my favourite person.',
  'Close! Puzzles are patient and so am I.',
  'No luck this round. Lucky me, though: I have you.',
  'That board was rude to you. Let us find a kinder one.',
  'Lost the puzzle, kept the charm.',
  'Oops. Breathe, smile, tap "next". I believe in you.',
  'Even the best {animal} herders have off days. You are still the best.',
  'This one was stubborn. You are more stubborn. Go again.',
  'A miss is just a warm-up. Love you.',
  // The cheeky ones (about a third of the pool). Edit to taste.
  'Lost the puzzle. Still got the dumptruck.',
  'The {animals} got distracted. Honestly, same. Look at you.',
  'The board won. Your legs remain undefeated.',
  'Lost one. Cheer up: that behind could stop traffic.',
  'The {animals} ran off. I would too, right behind you, for the view.',
];

// Shuffled cycle through a list so no message repeats until all have shown.
// `cycle` is { order: number[], pos: number } and is safe to store as JSON.
export function nextMessage(list, cycle, rng) {
  let { order, pos } = cycle || {};
  if (!Array.isArray(order) || order.length !== list.length || !(pos < order.length)) {
    order = list.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    pos = 0;
  }
  return { message: list[order[pos]], cycle: { order, pos: pos + 1 } };
}

export function fillAnimal(text, animal, animals) {
  return text.replaceAll('{animals}', animals).replaceAll('{animal}', animal);
}
