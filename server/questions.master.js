// Server-side master question bank definitions with private answer keys and evaluation criteria.
// This file is the single source of truth for all quiz content across the 4 seals.
// It is strictly server-side and must NEVER be imported or bundled into public client assets.

export const QUESTION_DEFINITIONS = [
  // ==========================================
  // SEAL 1: Tech Trivia (MCQ)
  // ==========================================
  {
    seal_number: 1,
    question_key: 's1_q1_http_403',
    question_type: 'mcq',
    display_order: 1,
    points: 1,
    is_active: true,
    question_text: 'A mischievous phantom tries to access a restricted crypt on a web server without proper clearance. Which HTTP status code will the server return?',
    options: ['404 Not Found', '403 Forbidden', '500 Internal Server Error', '302 Found'],
    answer_key: {
      correctIndex: 1,
      explanation: '403 Forbidden is returned when the client is authenticated or known but not allowed to access the resource.'
    }
  },
  {
    seal_number: 1,
    question_key: 's1_q2_css_transform_opacity',
    question_type: 'mcq',
    display_order: 2,
    points: 1,
    is_active: true,
    question_text: 'In modern web development for a spooky UI/UX design, which CSS property is primarily responsible for creating smooth, hardware-accelerated transitions or spooky floating hover animations without triggering heavy layout repaints?',
    options: ['margin and padding', 'transform and opacity', 'float and clear', 'display: inline-block'],
    answer_key: {
      correctIndex: 1,
      explanation: 'Animating properties like transform and opacity allows the browser GPU to handle rendering smoothly, avoiding expensive layout reflows on the DOM.'
    }
  },
  {
    seal_number: 1,
    question_key: 's1_q3_css_rem',
    question_type: 'mcq',
    display_order: 3,
    points: 1,
    is_active: true,
    question_text: 'In HTML/CSS styling for a haunted web portfolio, which unit of measurement is relative to the font size of the root element (<html>), making it ideal for scalable, responsive design?',
    options: ['em', 'rem', 'vh', 'px'],
    answer_key: {
      correctIndex: 1,
      explanation: 'rem is relative to the root html font size, so it scales consistently across the document.'
    }
  },
  {
    seal_number: 1,
    question_key: 's1_q4_git_commit_push',
    question_type: 'mcq',
    display_order: 4,
    points: 1,
    is_active: true,
    question_text: 'While collaborating on a haunted mansion codebase repository with your team, which of the following statements accurately explains the difference between git commit and git push?',
    options: [
      'git commit uploads your files to GitHub, while git push saves them to your local computer.',
      'git commit saves your staged changes to your local repository history, while git push uploads your local commits to a remote server (like GitHub) so others can pull them.',
      'git push prepares the files, and git commit deletes untracked files from the workspace.',
      'Both commands do the exact same thing; git push is just an older alias for git commit.'
    ],
    answer_key: {
      correctIndex: 1,
      explanation: 'git commit records staged changes in local history. git push uploads those local commits to a remote so teammates can pull them.'
    }
  },
  {
    seal_number: 1,
    question_key: 's1_q5_oops_polymorphism_private',
    question_type: 'mcq',
    display_order: 5,
    points: 1,
    is_active: true,
    question_text: 'Part 1: Which core pillar of Object-Oriented Programming allows a single function name or operator to behave differently depending on the context (e.g., function overloading)?\n\nPart 2: Which access specifier restricts data visibility so that members can only be accessed from within the same class?',
    options: [
      'Part 1: Inheritance | Part 2: Public',
      'Part 1: Polymorphism | Part 2: Private',
      'Part 1: Encapsulation | Part 2: Protected',
      'Part 1: Abstraction | Part 2: Friend'
    ],
    answer_key: {
      correctIndex: 1,
      explanation: 'Polymorphism lets one name behave differently by context (overloading/overriding). Private members are visible only inside the same class.'
    }
  },

  // ==========================================
  // SEAL 2: Debug the Dead (Code Editor)
  // ==========================================
  {
    seal_number: 2,
    question_key: 's2_q1_py_average_even',
    question_type: 'code',
    display_order: 1,
    points: 1,
    is_active: true,
    question_text: 'Fix this Python function so it correctly returns the average of all even numbers in the list. Iterate over every element, use a comparison (not assignment), and return 0 when there are no even numbers.',
    options: null,
    answer_key: {
      expectedCode: `def average_even_numbers(nums):
    total = 0
    count = 0
    for i in range(len(nums)):
        if nums[i] % 2 == 0:
            total += nums[i]
            count += 1
    if count == 0:
        return 0
    return total / count`,
      explanation: 'Start the loop at index 0, use == for comparison, keep return outside the loop, and guard against division by zero.'
    }
  },
  {
    seal_number: 2,
    question_key: 's2_q2_bhoothnath_jalebis',
    question_type: 'predict_output',
    display_order: 2,
    points: 1,
    is_active: true,
    question_text: 'In Bhoothnath, what sweet dish does the ghost Banku’s grandfather (played by Amitabh Bachchan) love?',
    options: null,
    answer_key: {
      expectedOutput: 'Jalebis',
      acceptedAnswers: ['Jalebi', 'Jalebis'],
      explanation: 'Banku’s grandfather is famously fond of jalebis.'
    }
  },
  {
    seal_number: 2,
    question_key: 's2_q3_cpp_get_average',
    question_type: 'code',
    display_order: 3,
    points: 1,
    is_active: true,
    question_text: 'Fix this C++ function so it returns the true average of a, b, and c as a float.',
    options: null,
    answer_key: {
      expectedCode: `float get_average(int a, int b, int c) {
    float sum = (a + b + c);
    float avg = sum / 3.0f;
    return avg;
}`,
      explanation: 'Add all three values first, then divide by 3.0f so the result is a floating-point average.'
    }
  },
  {
    seal_number: 2,
    question_key: 's2_q4_cpp_print_elements',
    question_type: 'code',
    display_order: 4,
    points: 1,
    is_active: true,
    question_text: 'Fix this C++ function so it prints each array element once. Correct the element count and remove the extra increment inside the subscript.',
    options: null,
    answer_key: {
      expectedCode: `#include <iostream>
using namespace std;

void print_elements() {
    int arr[] = {1, 2, 3, 4, 5};
    int limit = sizeof(arr) / sizeof(arr[0]);

    for (int i = 0; i < limit; i++) {
        cout << arr[i] << " ";
    }
}`,
      explanation: 'sizeof(arr) is bytes, not element count. Divide by sizeof(arr[0]) and print arr[i] without incrementing i again.'
    }
  },
  {
    seal_number: 2,
    question_key: 's2_q5_c_is_sorted',
    question_type: 'code',
    display_order: 5,
    points: 1,
    is_active: true,
    question_text: 'Fix this C function so it correctly checks whether an array of n integers is sorted in non-decreasing order, without reading past the last valid index.',
    options: null,
    answer_key: {
      expectedCode: `#include <stdio.h>

int is_sorted(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        if (arr[i] > arr[i + 1]) {
            return 0;
        }
    }
    return 1;
}`,
      explanation: 'Compare adjacent pairs only through i < n - 1 so arr[i + 1] stays in bounds.'
    }
  },

  // ==========================================
  // SEAL 3: DSA After Dark (MCQ)
  // ==========================================
  {
    seal_number: 3,
    question_key: 's3_q1_anagram_complexity',
    question_type: 'mcq',
    display_order: 1,
    points: 1,
    is_active: true,
    question_text: 'Kapidhwaj Innovations has just deployed the backend for a brand-new Ghostbnb platform. The system needs to quickly check if a newly listed haunted house ID string (S1) is a valid anagram of a verified paranormal zone hash (S2). Assuming both strings consist of lowercase English letters and have a length of N, what is the optimal time complexity to determine if they are anagrams?',
    options: [
      'O(N^2) using nested loops',
      'O(N) using a character frequency hash map/array (or O(N log N) by sorting)',
      'O(2^N) using recursive backtracking',
      'O(1) constant time using bitwise XOR'
    ],
    answer_key: {
      correctIndex: 1,
      explanation: 'Counting character frequencies via a frequency array achieves an optimal linear time complexity of O(N). Sorting both strings is O(N log N).'
    }
  },
  {
    seal_number: 3,
    question_key: 's3_q2_golmaal_laxman',
    question_type: 'predict_output',
    display_order: 2,
    points: 1,
    is_active: true,
    question_text: 'In Golmaal Again (Golmaal 4), which character’s body gets possessed by the spirit of Damini?',
    options: null,
    answer_key: {
      expectedOutput: 'Laxman',
      acceptedAnswers: [
        'Laxman',
        'Laxman Prasad',
        'Shreyas Talpade',
        'Laxman (played by Shreyas Talpade)',
        'Laxman played by Shreyas Talpade'
      ],
      explanation: 'Damini possesses Laxman, played by Shreyas Talpade.'
    }
  },
  {
    seal_number: 3,
    question_key: 's3_q3_bubble_sort_best_case',
    question_type: 'mcq',
    display_order: 3,
    points: 1,
    is_active: true,
    question_text: 'Part 1: Which sorting algorithm repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order?\n\nPart 2: What is the best-case time complexity of this algorithm when an early-exit optimization flag is used on an array that is already sorted?',
    options: [
      'Part 1: Selection Sort | Part 2: O(N^2)',
      'Part 1: Bubble Sort | Part 2: O(N)',
      'Part 1: Insertion Sort | Part 2: O(N log N)',
      'Part 1: Bubble Sort | Part 2: O(N^2)'
    ],
    answer_key: {
      correctIndex: 1,
      explanation: 'Bubble Sort swaps adjacent elements. With a swap flag, an already-sorted array finishes in one pass, so best-case time is O(N).'
    }
  },
  {
    seal_number: 3,
    question_key: 's3_q4_stack_postfix',
    question_type: 'mcq',
    display_order: 4,
    points: 1,
    is_active: true,
    question_text: 'Part 1: Which data structure is classically used to evaluate postfix mathematical expressions and check for balanced nested brackets in code editors?\n\nPart 2: What is the correct postfix (RPN) notation for the infix expression A + B * C?',
    options: [
      'Part 1: Queue | Part 2: A B + C *',
      'Part 1: Stack | Part 2: A B C * +',
      'Part 1: Stack | Part 2: (A + B) * C',
      'Part 1: Hash Map | Part 2: A B + C *'
    ],
    answer_key: {
      correctIndex: 1,
      explanation: 'Stacks manage nested structures and operator precedence. Multiplication binds first, so A + B * C becomes A B C * +.'
    }
  },
  {
    seal_number: 3,
    question_key: 's3_q5_stable_sort_quicksort',
    question_type: 'mcq',
    display_order: 5,
    points: 1,
    is_active: true,
    question_text: 'Part 1: What property defines a stable sorting algorithm?\n\nPart 2: Which of the following is a classic example of an unstable sorting algorithm?',
    options: [
      'Part 1: It guarantees O(N log N) time | Part 2: Merge Sort',
      'Part 1: It preserves the relative order of duplicate elements | Part 2: Quick Sort',
      'Part 1: It requires zero extra memory space | Part 2: Insertion Sort',
      'Part 1: It works without comparing elements directly | Part 2: Bubble Sort'
    ],
    answer_key: {
      correctIndex: 1,
      explanation: 'Stability preserves the original order of equal keys. Quick Sort is classically unstable because partitioning can swap distant equal elements.'
    }
  },

  // ==========================================
  // SEAL 4: Predict the Output (Terminal Input)
  // ==========================================
  {
    seal_number: 4,
    question_key: 's4_q1_py_even_sum',
    question_type: 'predict_output',
    display_order: 1,
    points: 1,
    is_active: true,
    question_text: 'What is the output of the following Python code?',
    options: null,
    answer_key: {
      expectedOutput: '6',
      explanation: 'range(1, 5) generates 1, 2, 3, 4. Even numbers are 2 and 4. Sum = 6.'
    }
  },
  {
    seal_number: 4,
    question_key: 's4_q2_bulbbul_ulte_pair',
    question_type: 'predict_output',
    display_order: 2,
    points: 1,
    is_active: true,
    question_text: 'In the movie Bulbbul, what physical trait/sign was traditionally used by village folk to identify a Chudail?',
    options: null,
    answer_key: {
      expectedOutput: 'Ulte pair',
      acceptedAnswers: [
        'Ulte pair',
        'Ulta pair',
        'Inverted feet',
        'Backward feet',
        'Inverted/Backward feet',
        'Inverted backward feet'
      ],
      explanation: 'Village folk identified a Chudail by ulte pair — inverted/backward feet.'
    }
  },
  {
    seal_number: 4,
    question_key: 's4_q3_cpp_nested_sum',
    question_type: 'predict_output',
    display_order: 3,
    points: 1,
    is_active: true,
    question_text: 'Trace the nested C++ loops and predict the exact printed output.',
    options: null,
    answer_key: {
      expectedOutput: '24',
      explanation: 'i=1: 2; i=2: 5 then 9; i=3: 13, 18, 24.'
    }
  },
  {
    seal_number: 4,
    question_key: 's4_q4_py_slice_supernatural',
    question_type: 'predict_output',
    display_order: 4,
    points: 1,
    is_active: true,
    question_text: 'What is printed by this Python slicing snippet?',
    options: null,
    answer_key: {
      expectedOutput: 'TNE',
      explanation: 'Slice [7:1:-2] starts at index 7 (T), then 5 (N), then 3 (E), stopping before index 1.'
    }
  },
  {
    seal_number: 4,
    question_key: 's4_q5_c_post_increment',
    question_type: 'predict_output',
    display_order: 5,
    points: 1,
    is_active: true,
    question_text: 'What is the output of this C program?',
    options: null,
    answer_key: {
      expectedOutput: '6 5',
      explanation: 'Post-increment assigns the current value of x (5) to y first, then increments x to 6.'
    }
  }
];

// Seal metadata for frontend structure
export const SEAL_METADATA = [
  {
    sealNumber: 1,
    title: 'Tech Trivia',
    topics: 'CYBERSECURITY · WEB DEVELOPMENT · GIT · OOPS IN C++',
    briefing: "The first seal guards the knowledge firewall. To pass, you must understand the very systems the Phantom has corrupted: cybersecurity, web development, version control, and object-oriented programming. Let's see whether your knowledge can survive the breach.",
    whisper: 'UNKNOWN: Your firewall is only as strong as its operator.',
    type: 'mcq'
  },
  {
    sealNumber: 2,
    title: 'Debug the Dead',
    topics: 'PYTHON · C++ · C · SYNTAX ERRORS · LOGICAL BUGS',
    briefing: 'The code is dying. Lines are corrupted. Logic is broken. Something has rewritten the rules of your programs. Find the bug in the code editor, repair the program with proper syntax, and restore the dead code.',
    whisper: 'UNKNOWN: I broke one line in every script. Can your code editor fix it?',
    type: 'code_editor'
  },
  {
    sealNumber: 3,
    title: 'DSA After Dark',
    topics: 'ANAGRAMS · SORTING · STACKS · STABILITY',
    briefing: "You have entered the Phantom's algorithmic maze. Every path looks correct until it isn't. Every decision has a consequence. Think carefully, because one wrong answer could leave you trapped in an endless loop.",
    whisper: 'UNKNOWN: The shortest path is not always the safest.',
    type: 'mcq'
  },
  {
    sealNumber: 4,
    title: 'Predict the Output',
    topics: 'OUTPUT TRACING · PYTHON · C++ · C',
    briefing: 'The final seal is different. You cannot fix the code. You cannot change the logic. You can only predict what happens next. Read every line. Type the exact output produced by the program into the terminal prompt.',
    whisper: 'UNKNOWN: No edits. No escape. Tell me what prints to the screen.',
    type: 'predict_output'
  }
];

// Presentation metadata for interactive fields (code editor & terminal predictor)
// Strictly non-secret frontend presentation attributes needed by the browser UI
export const QUESTION_PRESENTATION = {
  s2_q1_py_average_even: {
    language: 'python',
    filename: 'crypt_averages.py',
    hint: 'Check the loop start index, == vs =, where return sits, and division by zero.',
    starterCode: `def average_even_numbers(nums):
    total = 0
    count = 0
    for i in range(1, len(nums)):
        if nums[i] % 2 = 0:
            total += nums[i]
            count += 1
        return total / count`
  },
  s2_q2_bhoothnath_jalebis: {
    language: 'text',
    filename: 'bhoothnath.txt',
    hint: 'Name the sweet dish. Spelling variants like Jalebi/Jalebis are accepted.',
    codeSnippet: 'Film: Bhoothnath\nClue: Banku’s grandfather (Amitabh Bachchan) has a favorite sweet.'
  },
  s2_q3_cpp_get_average: {
    language: 'cpp',
    filename: 'spooky_average.cpp',
    hint: 'Operator precedence and integer division both distort the average.',
    starterCode: `float get_average(int a, int b, int c) {
    int sum = a + b + c / 3;
    float avg = sum / 2;
    return avg;
}`
  },
  s2_q4_cpp_print_elements: {
    language: 'cpp',
    filename: 'phantom_memory.cpp',
    hint: 'sizeof on an array is bytes, and i++ inside arr[i++] skips elements.',
    starterCode: `#include <iostream>
using namespace std;

void print_elements() {
    int arr[] = {1, 2, 3, 4, 5};
    int limit = sizeof(arr);

    for (int i = 0; i < limit; i++) {
        cout << arr[i++] << " ";
    }
}`
  },
  s2_q5_c_is_sorted: {
    language: 'c',
    filename: 'monster_sort_check.c',
    hint: 'The loop bound must stop before the last pair so arr[i + 1] stays in range.',
    starterCode: `#include <stdio.h>
int is_sorted(int arr[], int n) {
    for (int i = 0; i <= n; i++) {
        if (arr[i] > arr[i + 1]) {
            return 0;
        }
    }
    return 1;
}`
  },
  s3_q2_golmaal_laxman: {
    language: 'text',
    filename: 'golmaal.txt',
    hint: 'Name the possessed character (actor credit is optional).',
    codeSnippet: 'Film: Golmaal Again (Golmaal 4)\nClue: Damini’s spirit possesses one of the four friends.'
  },
  s4_q1_py_even_sum: {
    language: 'python',
    codeSnippet: `total = 0
for i in range(1, 5):
    if i % 2 == 0:
        total += i
print(total)`,
    hint: 'range(1, 5) is 1 through 4. Add the even values.'
  },
  s4_q2_bulbbul_ulte_pair: {
    language: 'text',
    codeSnippet: 'Film: Bulbbul\nClue: Village folk used a physical sign to identify a Chudail.',
    hint: 'Think inverted or backward feet — ulte pair.'
  },
  s4_q3_cpp_nested_sum: {
    language: 'cpp',
    codeSnippet: `#include <iostream>
using namespace std;

int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i++) {
        for (int j = 1; j <= i; j++) {
            sum += (i + j);
        }
    }
    cout << sum;
    return 0;
}`,
    hint: 'Trace every (i + j) added by the nested loops.'
  },
  s4_q4_py_slice_supernatural: {
    language: 'python',
    codeSnippet: `s = "SUPERNATURAL"
print(s[7:1:-2])`,
    hint: 'Start at index 7, step -2, and stop before index 1.'
  },
  s4_q5_c_post_increment: {
    language: 'c',
    codeSnippet: `#include <stdio.h>

int main() {
    int x = 5;
    int y = x++;
    printf("%d %d", x, y);
    return 0;
}`,
    hint: 'x++ assigns first, then increments. printf prints x then y.'
  }
};
