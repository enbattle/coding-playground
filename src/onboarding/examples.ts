export interface CodeExample {
  id: string;
  name: string;
  code: string;
}

/**
 * A small curated set of starter snippets, surfaced as "Load Example: …" commands in the command
 * palette (see src/commandPalette/commands.ts). Kept short and self-contained — no DOM, no async
 * timing to explain, just something to run and read console output from immediately. One
 * deliberately uses a curated package (zod) so it doubles as a pointer toward the Packages panel.
 */
export const CODE_EXAMPLES: CodeExample[] = [
  {
    id: 'array-pipeline',
    name: 'Array pipeline',
    code: `const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const sumOfSquaresOfEvens = numbers
  .filter((n) => n % 2 === 0)
  .map((n) => n * n)
  .reduce((total, n) => total + n, 0);

console.log(
  "Even numbers:",
  numbers.filter((n) => n % 2 === 0),
);
console.log("Sum of their squares:", sumOfSquaresOfEvens);
`,
  },
  {
    id: 'zod-validation',
    name: 'Validate data with zod',
    code: `import { z } from "zod";

const User = z.object({
  name: z.string(),
  age: z.number().int().positive(),
});

const valid = User.safeParse({ name: "Ada", age: 30 });
console.log("Valid input accepted:", valid.success);

const invalid = User.safeParse({ name: "Bad", age: -5 });
console.log("Invalid input rejected:", invalid.success);
if (!invalid.success) {
  console.log("Why:", invalid.error.issues);
}
`,
  },
  {
    id: 'class-generics',
    name: 'Classes & generics',
    code: `class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  get size(): number {
    return this.items.length;
  }
}

const stack = new Stack<string>();
stack.push("first");
stack.push("second");
console.log("Stack size:", stack.size);
console.log("Popped:", stack.pop());
`,
  },
];
