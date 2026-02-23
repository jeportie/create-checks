// ************************************************************************** //
//                                                                            //
//                                                                            //
//   quickSort.ts                                                             //
//                                                                            //
//   By: jeportie <jeromep.dev@gmail.com>                                     //
//                                                                            //
//   Created: 2026/02/21 20:09:48 by jeportie                                 //
//   Updated: 2026/02/22 18:47:27 by jeportie                                 //
//                                                                            //
// ************************************************************************** //

export function quickSort(array: number[]): number[] {
  if (array.length <= 1) {
    return array;
  }

  const pivotIndex = array.length - 1;
  const pivot = array[pivotIndex]!;
  const left: number[] = [];
  const right: number[] = [];

  for (let i = 0; i < pivotIndex; i++) {
    const curr = array[i]!;

    if (curr < pivot) {
      left.push(curr);
    } else {
      right.push(curr);
    }
  }

  return [...quickSort(left), pivot, ...quickSort(right)];
}
