// Server-side master question bank definitions with private answer keys and evaluation criteria.
// This file is the single source of truth for all quiz content across the 4 seals.
// It is strictly server-side and must NEVER be imported or bundled into public client assets.

export const QUESTION_DEFINITIONS = [
  // ==========================================
  // SEAL 1: Tech Trivia (MCQ)
  // ==========================================
  
  {
    seal_number: 1,
    question_key: 's1_q1_http_forbidden',
    question_type: 'mcq',
    display_order: 1,
    points: 1,
    is_active: true,
    question_text: 'A mischievous phantom tries to access a restricted crypt on a web server without proper clearance. Which HTTP status code will the server return?',
    options: ['404 Not Found', '403 Forbidden', '500 Internal Server Error', '302 Found'],
    answer_key: {
      correctIndex: 1,
      explanation: 'HTTP 403 Forbidden means the server understood the request but refuses to authorize access.'
    }
  },
  {
    seal_number: 1,
    question_key: 's1_q2_css_animation',
    question_type: 'mcq',
    display_order: 2,
    points: 1,
    is_active: true,
    question_text: 'In modern web development, which CSS properties are commonly used for smooth transitions and floating hover animations without triggering heavy layout repaints?',
    options: ['margin and padding', 'transform and opacity', 'float and clear', 'display: inline-block'],
    answer_key: {
      correctIndex: 1,
      explanation: 'Transform and opacity can often be animated efficiently without repeatedly recalculating layout.'
    }
  },
  {
    seal_number: 1,
    question_key: 's1_q3_css_rem',
    question_type: 'mcq',
    display_order: 3,
    points: 1,
    is_active: true,
    question_text: 'Which CSS unit is relative to the font size of the root HTML element?',
    options: ['em', 'rem', 'vh', 'px'],
    answer_key: {
      correctIndex: 1,
      explanation: 'The rem unit is relative to the root element font size.'
    }
  },
  {
    seal_number: 1,
    question_key: 's1_q4_git_commit_push',
    question_type: 'mcq',
    display_order: 4,
    points: 1,
    is_active: true,
    question_text: 'What is the difference between git commit and git push?',
    options: [
      'Commit uploads to GitHub, while push saves locally.',
      'Commit saves staged changes to local repository history, while push uploads local commits to a remote repository.',
      'Push prepares files and commit deletes untracked files.',
      'They do exactly the same thing.'
    ],
    answer_key: {
      correctIndex: 1,
      explanation: 'A commit records staged changes locally; a push sends local commits to the remote repository.'
    }
  },
  {
    seal_number: 1,
    question_key: 's1_q5_oops_pillars',
    question_type: 'mcq',
    display_order: 5,
    points: 1,
    is_active: true,
    question_text: 'Which OOP pillar allows functions or operators to behave differently depending on context, and which access specifier restricts access to members within the same class?',
    options: [
      'Inheritance | Public',
      'Polymorphism | Private',
      'Encapsulation | Protected',
      'Abstraction | Friend'
    ],
    answer_key: {
      correctIndex: 1,
      explanation: 'Polymorphism supports behavior such as function overloading, while private members are accessible from within their own class.'
    }
  },
  

  // ==========================================
  // SEAL 2: Debug the Dead (Code Editor)
  // ==========================================
  
  {
    seal_number: 2,
    question_key: 's2_q1_python_average_even',
    question_type: 'code',
    display_order: 1,
    points: 1,
    is_active: true,
    question_text: 'Fix the Python function so it calculates the average of all even numbers in the list. If there are no even numbers, return 0.',
    options: null,
    answer_key: {
      expectedCode: 'def average_even_numbers(nums):\n    total = 0\n    count = 0\n    for i in range(len(nums)):\n        if nums[i] % 2 == 0:\n            total += nums[i]\n            count += 1\n    if count == 0:\n        return 0\n    return total / count',
      explanation: 'Use == for comparison, start the loop at index 0, return after the loop, and handle the case where no even numbers are found.'
    }
  },
  {
    seal_number: 2,
    question_key: 's2_q2_bhoothnath_trivia',
    question_type: 'mcq',
    display_order: 2,
    points: 1,
    is_active: true,
    question_text: 'In the movie Bhoothnath, which sweet dish does Banku’s ghost grandfather love?',
    options: ['Gulab jamun', 'Jalebis', 'Rasgulla', 'Laddu'],
    answer_key: {
      correctIndex: 1,
      explanation: 'The answer specified in the event question sheet is jalebis.'
    }
  },
  {
    seal_number: 2,
    question_key: 's2_q3_cpp_average',
    question_type: 'code',
    display_order: 3,
    points: 1,
    is_active: true,
    question_text: 'Fix the C++ function so it correctly calculates and returns the average of the three integer arguments.',
    options: null,
    answer_key: {
      expectedCode: 'float get_average(int a, int b, int c) {\n    float sum = a + b + c;\n    float avg = sum / 3.0f;\n    return avg;\n}',
      explanation: 'Add all three values first and divide by 3.0f to calculate a floating-point average.'
    }
  },
  {
    seal_number: 2,
    question_key: 's2_q4_cpp_array_loop',
    question_type: 'code',
    display_order: 4,
    points: 1,
    is_active: true,
    question_text: 'Fix the C++ function so it prints every array element exactly once.',
    options: null,
    answer_key: {
      expectedCode: '#include <iostream>\nusing namespace std;\nvoid print_elements() {\n    int arr[] = {1, 2, 3, 4, 5};\n    int limit = sizeof(arr) / sizeof(arr[0]);\n    for (int i = 0; i < limit; i++) {\n        cout << arr[i] << " ";\n    }\n}',
      explanation: 'Calculate the number of elements using sizeof(arr) / sizeof(arr[0]) and do not increment i inside the output expression.'
    }
  },
  {
    seal_number: 2,
    question_key: 's2_q5_c_sorted_array',
    question_type: 'code',
    display_order: 5,
    points: 1,
    is_active: true,
    question_text: 'Fix the C function so it checks whether an array is sorted in ascending order without accessing elements beyond the array bounds.',
    options: null,
    answer_key: {
      expectedCode: '#include <stdio.h>\nint is_sorted(int arr[], int n) {\n    for (int i = 0; i < n - 1; i++) {\n        if (arr[i] > arr[i + 1]) {\n            return 0;\n        }\n    }\n    return 1;\n}',
      explanation: 'Stop the loop at i < n - 1 because each iteration compares arr[i] with arr[i + 1].'
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
    question_text: 'Two strings contain only lowercase letters and have length N. What is the optimal time complexity for checking whether they are anagrams using a character-frequency array?',
    options: ['O(N²) using nested loops', 'O(N) using a frequency array', 'O(2^N) using recursion', 'O(1) using XOR'],
    answer_key: {
      correctIndex: 1,
      explanation: 'Counting the frequency of each character in both strings takes linear time.'
    }
  },
  {
    seal_number: 3,
    question_key: 's3_q2_golmaal_trivia',
    question_type: 'mcq',
    display_order: 2,
    points: 1,
    is_active: true,
    question_text: 'In Golmaal Again, whose body gets possessed by Damini?',
    options: ['Laxman', 'Gopal', 'Madhav', 'Lucky'],
    answer_key: {
      correctIndex: 0,
      explanation: 'This is the answer specified in the event question sheet.'
    }
  },
  {
    seal_number: 3,
    question_key: 's3_q3_bubble_sort_complexity',
    question_type: 'mcq',
    display_order: 3,
    points: 1,
    is_active: true,
    question_text: 'Which algorithm repeatedly compares adjacent elements and swaps them if they are in the wrong order, and can run in O(N) time in the best case when an early-exit optimization is used?',
    options: ['Selection sort — O(N²)', 'Bubble sort — O(N)', 'Insertion sort — O(N log N)', 'Bubble sort — O(N²) in every case'],
    answer_key: {
      correctIndex: 1,
      explanation: 'Optimized bubble sort can stop after one pass if no swaps occur.'
    }
  },
  {
    seal_number: 3,
    question_key: 's3_q4_stack_postfix',
    question_type: 'mcq',
    display_order: 4,
    points: 1,
    is_active: true,
    question_text: 'Which data structure is commonly used for postfix expression evaluation and balanced-bracket checking? What is the postfix form of A + B * C?',
    options: ['Queue | A B + C *', 'Stack | A B C * +', 'Stack | (A + B) * C', 'Hash map | A B + C *'],
    answer_key: {
      correctIndex: 1,
      explanation: 'A stack supports postfix evaluation and bracket matching; multiplication takes precedence, so the postfix form is A B C * +.'
    }
  },
  {
    seal_number: 3,
    question_key: 's3_q5_sorting_stability',
    question_type: 'mcq',
    display_order: 5,
    points: 1,
    is_active: true,
    question_text: 'Which statement correctly describes a stable sorting algorithm and gives an unstable example?',
    options: [
      'It guarantees O(N log N) time | Merge sort',
      'It preserves the relative order of equal elements | Quick sort',
      'It always uses zero extra memory | Insertion sort',
      'It performs no direct comparisons | Bubble sort'
    ],
    answer_key: {
      correctIndex: 1,
      explanation: 'Stability preserves the relative order of equal-key elements; standard quicksort is generally unstable.'
    }
  },


  // ==========================================
  // SEAL 4: Predict the Output (Terminal Input)
  // ==========================================
  
{
  question_key: 's4_q1_python_even_sum',
  seal_number: 4,
  question_type: 'predict_output',
  question_text: 'What is the output of this Python code?',
  code: 'total = 0\nfor i in range(1, 5):\n    if i % 2 == 0:\n        total += i\nprint(total)',
  answer_key: {
    expectedOutput: '6',
    explanation: 'The even numbers 2 and 4 add up to 6.',
  },
  points: 10,
},
{
  question_key: 's4_q2_bulbbul_trivia',
  seal_number: 4,
  question_type: 'predict_output',
  question_text: 'In the movie Bulbbul, what traditional sign is associated with the Chudail?',
  answer_key: {
    expectedOutput: 'Ulte pair',
    explanation: 'The Chudail is associated with the Ulte pair, a traditional symbol in the film.'
  },
  points: 10,
},
{
  question_key: 's4_q3_cpp_nested_sum',
  seal_number: 4,
  question_type: 'predict_output',
  question_text: 'Predict the output of this C++ code.',
  code: 'int sum = 0;\nfor (int i = 1; i <= 3; i++) {\n    for (int j = 1; j <= 2; j++) {\n        sum += i * j;\n    }\n}\ncout << sum;',
  answer_key: {
    expectedOutput: '18',
    explanation: 'The nested loops calculate the sum of products of i and j for all combinations, resulting in 18.'
  },
  points: 10,
},
{
  question_key: 's4_q4_python_slicing',
  seal_number: 4,
  question_type: 'predict_output',
  question_text: 'What is the output of this Python code?',
  code: 's = "SUPERNATURAL"\nprint(s[7:1:-2])',
  answer_key: {
    expectedOutput: 'TNE',
    explanation: 'The slicing operation s[7:1:-2] extracts characters from index 7 to 1 (exclusive) with a step of -2.'
  },
  points: 10,
},
{
  question_key: 's4_q5_c_post_increment',
  seal_number: 4,
  question_type: 'predict_output',
  question_text: 'Predict the output of this C code.',
  code: 'int x = 5;\nint y = x++;\nprintf("%d %d", x, y);',
  answer_key: {
    expectedOutput: '6 5',
    explanation: 'The post-increment operator increments x after its value is used in the assignment to y.'
  },
  points: 10,
},

];

// Seal metadata for frontend structure
export const SEAL_METADATA = [
  {
    sealNumber: 1,
    title: 'Tech Trivia',
    topics: 'AI · CYBERSECURITY · WEB DEVELOPMENT · COMPUTER FUNDAMENTALS',
    briefing: "The first seal guards the knowledge firewall. To pass, you must understand the very systems the Phantom has corrupted: AI, cybersecurity, web development, and the fundamentals of computing. Let's see whether your knowledge can survive the breach.",
    whisper: 'UNKNOWN: Your firewall is only as strong as its operator.',
    type: 'mcq'
  },
  {
    sealNumber: 2,
    title: 'Debug the Dead',
    topics: 'SYNTAX ERRORS · LOGICAL BUGS · MISSING INDENTATION · CODE REPAIR',
    briefing: 'The code is dying. Lines are corrupted. Logic is broken. Something has rewritten the rules of your programs. Find the bug in the code editor, repair the program with proper syntax, and restore the dead code.',
    whisper: 'UNKNOWN: I broke one line in every script. Can your code editor fix it?',
    type: 'code_editor'
  },
  {
    sealNumber: 3,
    title: 'DSA After Dark',
    topics: 'ARRAYS · STRINGS · SORTING · TIME COMPLEXITY',
    briefing: "You have entered the Phantom's algorithmic maze. Every path looks correct until it isn't. Every decision has a consequence. Think carefully, because one wrong answer could leave you trapped in an endless loop.",
    whisper: 'UNKNOWN: The shortest path is not always the safest.',
    type: 'mcq'
  },
  {
    sealNumber: 4,
    title: 'Predict the Output',
    topics: 'OUTPUT TRACING · C · C++ · PYTHON · JAVASCRIPT',
    briefing: 'The final seal is different. You cannot fix the code. You cannot change the logic. You can only predict what happens next. Read every line. Type the exact output produced by the program into the terminal prompt.',
    whisper: 'UNKNOWN: No edits. No escape. Tell me what prints to the screen.',
    type: 'predict_output'
  }
];

// Presentation metadata for interactive fields (code editor & terminal predictor)
// Strictly non-secret frontend presentation attributes needed by the browser UI
export const QUESTION_PRESENTATION = {
  s2_q1_python_average_even: {
    language: 'python',
    filename: 'average_even_numbers.py',
    hint: 'Check the comparison operator, loop bounds, indentation, and division by zero.',
    starterCode: 'def average_even_numbers(nums):\n    total = 0\n    count = 0\n    for i in range(1, len(nums)):\n        if nums[i] % 2 = 0:\n            total += nums[i]\n            count += 1\n        return total / count'
  },
  s2_q3_cpp_average: {
    language: 'cpp',
    filename: 'average.cpp',
    hint: 'Check the sum, the divisor, and integer versus floating-point division.',
    starterCode: 'float get_average(int a, int b, int c) {\n    int sum = a + b + c / 3;\n    float avg = sum / 2;\n    return avg;\n}'
  },
  s2_q4_cpp_array_loop: {
    language: 'cpp',
    filename: 'array_loop.cpp',
    hint: 'Check how sizeof works and whether the loop increments the index more than once.',
    starterCode: '#include <iostream>\nusing namespace std;\nvoid print_elements() {\n    int arr[] = {1, 2, 3, 4, 5};\n    int limit = sizeof(arr);\n    for (int i = 0; i < limit; i++) {\n        cout << arr[i++] << " ";\n    }\n}'
  },
  s2_q5_c_sorted_array: {
    language: 'c',
    filename: 'is_sorted.c',
    hint: 'Check the loop condition and the final index accessed by arr[i + 1].',
    starterCode: '#include <stdio.h>\nint is_sorted(int arr[], int n) {\n    for (int i = 0; i <= n; i++) {\n        if (arr[i] > arr[i + 1]) {\n            return 0;\n        }\n    }\n    return 1;\n}'
  },

  
s4_q1_python_even_sum: {
  language: 'python',
  filename: 'even_sum.py',
  hint: 'Trace the loop and add only the even numbers.',
},
s4_q2_bulbbul_trivia: {
  language: 'text',
  filename: 'bulbbul.txt',
  hint: 'Enter the traditional sign in a short phrase.',
},
s4_q3_cpp_nested_sum: {
  language: 'cpp',
  filename: 'nested_loop.cpp',
  hint: 'Calculate each product from the inner loop, then add them.',
},
s4_q4_python_slicing: {
  language: 'python',
  filename: 'string_slicing.py',
  hint: 'Start at index 7 and move backward by 2, stopping before index 1.',
},
s4_q5_c_post_increment: {
  language: 'c',
  filename: 'post_increment.c',
  hint: 'Remember that post-increment uses the old value before increasing x.',
},

};
