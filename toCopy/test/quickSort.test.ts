// ************************************************************************** //
//                                                                            //
//                                                                            //
//   quickSort.test.ts                                                        //
//                                                                            //
//   By: jeportie <jeromep.dev@gmail.com>                                     //
//                                                                            //
//   Created: 2026/02/21 20:10:59 by jeportie                                 //
//   Updated: 2026/02/21 20:14:43 by jeportie                                 //
//                                                                            //
// ************************************************************************** //

import { describe, it, expect } from 'vitest';

import { quickSort } from '@/quickSort';

describe('quickSort tester', () => {
  it('should sort the array', () => {
    const arr = [5, 4, 1, 3, 2];
    const sorted = [1, 2, 3, 4, 5];

    expect(quickSort(arr)).toEqual(sorted);
  });
});
