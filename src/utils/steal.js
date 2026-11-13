// Starting value for the steal power-up's UI state.
// streak: good rolls in a row this turn   at: rolls needed (the server sends the real number)
// ready: a steal is unlocked              open: the steal pop-up is showing
// intro: show the "STEAL UNLOCKED" animation first   done: result of the last steal
export const INITIAL_STEAL = {
  streak: 0,
  at: 8,
  ready: false,
  open: false,
  intro: false,
  done: null,
};
