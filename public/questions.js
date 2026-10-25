// Safe public question definitions for offline development & fallback.
// NOTICE: Private answer keys, expected code, expected output, and explanations
// have been removed to protect the integrity of the live quiz.
// In production, questions are delivered dynamically via /api/quiz/questions.


window.QUIZ_LEVELS = [
  {
    title: 'Tech Trivia',
    topics: 'CYBERSECURITY · WEB DEVELOPMENT · GIT · OOPS',
    briefing: "The first seal guards the knowledge firewall. To pass, you must understand the systems the Phantom has corrupted. Let's see whether your knowledge can survive the breach.",
    whisper: 'UNKNOWN: Your firewall is only as strong as its operator.',
    type: 'mcq',
    questions: [
      {
        questionKey: 's1_q1_http_forbidden',
        question: 'A mischievous phantom tries to access a restricted crypt on a web server without proper clearance. Which HTTP status code will the server return?',
        options: [
          '404 Not Found',
          '403 Forbidden',
          '500 Internal Server Error',
          '302 Found'
        ]
      },
      {
        questionKey: 's1_q2_css_animation',
        question: 'In modern web development, which CSS properties are primarily responsible for smooth, hardware-accelerated transitions and floating hover animations?',
        options: [
          'margin and padding',
          'transform and opacity',
          'float and clear',
          'display: inline-block'
        ]
      },
      {
        questionKey: 's1_q3_css_rem',
        question: 'Which CSS unit is relative to the font size of the root HTML element?',
        options: ['em', 'rem', 'vh', 'px']
      },
      {
        questionKey: 's1_q4_git_commit_push',
        question: 'Which statement correctly explains the difference between git commit and git push?',
        options: [
          'git commit uploads files to GitHub, while git push saves them locally.',
          'git commit saves staged changes in local repository history, while git push uploads local commits to a remote server.',
          'git push prepares files and git commit deletes untracked files.',
          'Both commands do exactly the same thing.'
        ]
      },
      {
        questionKey: 's1_q5_oops_pillars',
        question: 'Which core OOP pillar allows a function name or operator to behave differently depending on context, and which access specifier restricts members to the same class?',
        options: [
          'Inheritance | Public',
          'Polymorphism | Private',
          'Encapsulation | Protected',
          'Abstraction | Friend'
        ]
      }
    ]
  },

  {
    title: 'Debug the Dead',
    topics: 'PYTHON · C++ · C · LOGICAL BUGS · CODE REPAIR',
    briefing: 'The code is dying. Lines are corrupted. Logic is broken. Find the bugs, repair the programs, and restore the dead code.',
    whisper: 'UNKNOWN: I broke the code. Can you repair it?',
    type: 'code_editor',
    questions: [
      {
        questionKey: 's2_q1_python_average_even',
        question: 'Fix the Python function so it calculates the average of all even numbers in nums. Correct the loop range, comparison operator, indentation, and handling of a zero count.',
        language: 'python',
        filename: 'crypt_averages.py',
        hint: 'Check the loop start, use == for comparison, place return outside the loop, and handle count == 0.',
        starterCode: 'def average_even_numbers(nums):\n    total = 0\n    count = 0\n    for i in range(1, len(nums)):\n        if nums[i] % 2 = 0:\n            total += nums[i]\n            count += 1\n        return total / count'
      },
      {
        questionKey: 's2_q2_bhoothnath_trivia',
        question: 'In Bhoothnath, what sweet dish does the ghost Banku’s grandfather, played by Amitabh Bachchan, love? Enter the answer in the editor.',
        language: 'text',
        filename: 'ghost_trivia.txt',
        hint: 'Answer with the name of the sweet dish.',
        starterCode: ''
      },
      {
        questionKey: 's2_q3_cpp_average',
        question: 'Fix the C++ function so it calculates the average of a, b, and c correctly using floating-point arithmetic.',
        language: 'cpp',
        filename: 'spooky_average.cpp',
        hint: 'Calculate the sum first, then divide by 3.0f.',
        starterCode: 'float get_average(int a, int b, int c) {\n    int sum = a + b + c / 3;\n    float avg = sum / 2;\n    return avg;\n}'
      },
      {
        questionKey: 's2_q4_cpp_array_loop',
        question: 'Fix the C++ function so it prints every array element exactly once. Correct the element count and remove the unintended increment inside the array index.',
        language: 'cpp',
        filename: 'phantom_memory.cpp',
        hint: 'Use sizeof(arr) / sizeof(arr[0]) and print arr[i] without incrementing i inside the expression.',
        starterCode: '#include <iostream>\nusing namespace std;\n\nvoid print_elements() {\n    int arr[] = {1, 2, 3, 4, 5};\n    int limit = sizeof(arr);\n\n    for (int i = 0; i < limit; i++) {\n        cout << arr[i++] << " ";\n    }\n}'
      },
      {
        questionKey: 's2_q5_c_sorted_array',
        question: 'Fix the C function so it checks whether an array is sorted in ascending order without accessing elements outside the array.',
        language: 'c',
        filename: 'monster_sorting.c',
        hint: 'Compare arr[i] with arr[i + 1] only while i is less than n - 1.',
        starterCode: '#include <stdio.h>\n\nint is_sorted(int arr[], int n) {\n    for (int i = 0; i <= n; i++) {\n        if (arr[i] > arr[i + 1]) {\n            return 0;\n        }\n    }\n    return 1;\n}'
      }
    ]
  },

  {
    title: 'DSA After Dark',
    topics: 'ANAGRAMS · SORTING · STACKS · ALGORITHMS',
    briefing: "You have entered the Phantom's algorithmic maze. Think carefully, because one wrong answer could leave you trapped in an endless loop.",
    whisper: 'UNKNOWN: The shortest path is not always the safest.',
    type: 'mcq',
    questions: [
      {
        questionKey: 's3_q1_anagram_complexity',
        question: 'Two lowercase strings of length N must be checked for anagrams. What is the optimal time complexity using a character-frequency array?',
        options: [
          'O(N²) using nested loops',
          'O(N) using a character-frequency array, or O(N log N) by sorting',
          'O(2^N) using recursive backtracking',
          'O(1) using bitwise XOR'
        ]
      },
      {
        questionKey: 's3_q2_golmaal_trivia',
        question: 'In Golmaal Again (Golmaal 4), which character’s body gets possessed by the spirit of Damini?',
        options: [
          'Laxman',
          'Gopal',
          'Madhav',
          'Lucky'
        ]
      },
      {
        questionKey: 's3_q3_bubble_sort',
        question: 'Which sorting algorithm compares adjacent elements and swaps them when they are in the wrong order? What is its best-case time complexity with early-exit optimization on an already-sorted array?',
        options: [
          'Selection Sort | O(N²)',
          'Bubble Sort | O(N)',
          'Insertion Sort | O(N log N)',
          'Bubble Sort | O(N²)'
        ]
      },
      {
        questionKey: 's3_q4_stack_postfix',
        question: 'Which data structure is used for postfix evaluation and balanced brackets, and what is the postfix notation for A + B * C?',
        options: [
          'Queue | A B + C *',
          'Stack | A B C * +',
          'Stack | (A + B) * C',
          'Hash Map | A B + C *'
        ]
      },
      {
        questionKey: 's3_q5_sorting_stability',
        question: 'What defines a stable sorting algorithm, and which of these is a classic example of an unstable sorting algorithm?',
        options: [
          'Guarantees O(N log N) time | Merge Sort',
          'Preserves the relative order of equal elements | Quick Sort',
          'Requires zero extra memory | Insertion Sort',
          'Does not compare elements directly | Bubble Sort'
        ]
      }
    ]
  },

  {
    title: 'Predict the Output',
    topics: 'PYTHON · C++ · STRING SLICING · C',
    briefing: 'The final seal is different. Read every line carefully and determine the exact output or answer requested.',
    whisper: 'UNKNOWN: Tell me what happens next.',
    type: 'predict_output',
    questions: [
      {
        questionKey: 's4_q1_python_even_sum',
        question: 'Predict the exact output of this Python program.',
        language: 'python',
        codeSnippet: 'total = 0\n\nfor i in range(1, 5):\n    if i % 2 == 0:\n        total += i\n\nprint(total)',
        hint: 'range(1, 5) generates 1, 2, 3, and 4. Add only the even numbers.'
      },
      {
        questionKey: 's4_q2_bulbbul_trivia',
        question: 'In the movie Bulbbul, what physical trait or sign was traditionally used by village folk to identify a Chudail? Type the answer.',
        language: 'text',
        codeSnippet: '// Answer the question in the response field.',
        hint: 'Think about the direction of the feet.'
      },
      {
        questionKey: 's4_q3_cpp_nested_sum',
        question: 'Predict the exact output of this C++ program.',
        language: 'cpp',
        codeSnippet: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int sum = 0;\n    for (int i = 1; i <= 3; i++) {\n        for (int j = 1; j <= 2; j++) {\n            sum += i * j;\n        }\n    }\n    cout << sum;\n    return 0;\n}',
        hint: 'Trace both loops and add i + j during every iteration.'
      },
      {
        questionKey: 's4_q4_python_slicing',
        question: 'What is printed by this Python code snippet?',
        language: 'python',
        codeSnippet: 's = "SUPERNATURAL"\nprint(s[7:1:-2])',
        hint: 'Start at index 7, move backward by 2, and stop before index 1.'
      },
      {
        questionKey: 's4_q5_c_post_increment',
        question: 'Predict the exact output of this C program.',
        language: 'c',
        codeSnippet: '#include <stdio.h>\n\nint main() {\n    int x = 5;\n    int y = x++;\n    printf("%d %d", x, y);\n    return 0;\n}',
        hint: 'Post-increment assigns the old value to y before increasing x.'
      }
    ]
  }
];