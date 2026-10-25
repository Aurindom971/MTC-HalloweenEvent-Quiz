// Safe public question definitions for offline development & fallback.
// NOTICE: Private answer keys, expected code, expected output, and explanations
// have been removed to protect the integrity of the live quiz.
// In production, questions are delivered dynamically via /api/quiz/questions.

window.QUIZ_LEVELS = [
  {
    title: 'Tech Trivia',
    topics: 'CYBERSECURITY · WEB DEVELOPMENT · GIT · OOPS IN C++',
    briefing: "The first seal guards the knowledge firewall. To pass, you must understand the very systems the Phantom has corrupted: cybersecurity, web development, version control, and object-oriented programming. Let's see whether your knowledge can survive the breach.",
    whisper: 'UNKNOWN: Your firewall is only as strong as its operator.',
    type: 'mcq',
    questions: [
      {
        questionKey: 's1_q1_http_403',
        questionType: 'mcq',
        question: 'A mischievous phantom tries to access a restricted crypt on a web server without proper clearance. Which HTTP status code will the server return?',
        options: ['404 Not Found', '403 Forbidden', '500 Internal Server Error', '302 Found']
      },
      {
        questionKey: 's1_q2_css_transform_opacity',
        questionType: 'mcq',
        question: 'In modern web development for a spooky UI/UX design, which CSS property is primarily responsible for creating smooth, hardware-accelerated transitions or spooky floating hover animations without triggering heavy layout repaints?',
        options: ['margin and padding', 'transform and opacity', 'float and clear', 'display: inline-block']
      },
      {
        questionKey: 's1_q3_css_rem',
        questionType: 'mcq',
        question: 'In HTML/CSS styling for a haunted web portfolio, which unit of measurement is relative to the font size of the root element (<html>), making it ideal for scalable, responsive design?',
        options: ['em', 'rem', 'vh', 'px']
      },
      {
        questionKey: 's1_q4_git_commit_push',
        questionType: 'mcq',
        question: 'While collaborating on a haunted mansion codebase repository with your team, which of the following statements accurately explains the difference between git commit and git push?',
        options: [
          'git commit uploads your files to GitHub, while git push saves them to your local computer.',
          'git commit saves your staged changes to your local repository history, while git push uploads your local commits to a remote server (like GitHub) so others can pull them.',
          'git push prepares the files, and git commit deletes untracked files from the workspace.',
          'Both commands do the exact same thing; git push is just an older alias for git commit.'
        ]
      },
      {
        questionKey: 's1_q5_oops_polymorphism_private',
        questionType: 'mcq',
        question: 'Part 1: Which core pillar of Object-Oriented Programming allows a single function name or operator to behave differently depending on the context (e.g., function overloading)?\n\nPart 2: Which access specifier restricts data visibility so that members can only be accessed from within the same class?',
        options: [
          'Part 1: Inheritance | Part 2: Public',
          'Part 1: Polymorphism | Part 2: Private',
          'Part 1: Encapsulation | Part 2: Protected',
          'Part 1: Abstraction | Part 2: Friend'
        ]
      }
    ]
  },
  {
    title: 'Debug the Dead',
    topics: 'PYTHON · C++ · C · SYNTAX ERRORS · LOGICAL BUGS',
    briefing: 'The code is dying. Lines are corrupted. Logic is broken. Something has rewritten the rules of your programs. Find the bug in the code editor, repair the program with proper syntax, and restore the dead code.',
    whisper: 'UNKNOWN: I broke one line in every script. Can your code editor fix it?',
    type: 'code_editor',
    questions: [
      {
        questionKey: 's2_q1_py_average_even',
        questionType: 'code',
        question: 'Fix this Python function so it correctly returns the average of all even numbers in the list. Iterate over every element, use a comparison (not assignment), and return 0 when there are no even numbers.',
        language: 'python',
        filename: 'crypt_averages.py',
        hint: 'Check the loop start index, == vs =, where return sits, and division by zero.',
        starterCode: 'def average_even_numbers(nums):\n    total = 0\n    count = 0\n    for i in range(1, len(nums)):\n        if nums[i] % 2 = 0:\n            total += nums[i]\n            count += 1\n        return total / count'
      },
      {
        questionKey: 's2_q2_bhoothnath_jalebis',
        questionType: 'predict_output',
        question: 'In Bhoothnath, what sweet dish does the ghost Banku’s grandfather (played by Amitabh Bachchan) love?',
        language: 'text',
        hint: 'Name the sweet dish. Spelling variants like Jalebi/Jalebis are accepted.',
        codeSnippet: 'Film: Bhoothnath\nClue: Banku’s grandfather (Amitabh Bachchan) has a favorite sweet.'
      },
      {
        questionKey: 's2_q3_cpp_get_average',
        questionType: 'code',
        question: 'Fix this C++ function so it returns the true average of a, b, and c as a float.',
        language: 'cpp',
        filename: 'spooky_average.cpp',
        hint: 'Operator precedence and integer division both distort the average.',
        starterCode: 'float get_average(int a, int b, int c) {\n    int sum = a + b + c / 3;\n    float avg = sum / 2;\n    return avg;\n}'
      },
      {
        questionKey: 's2_q4_cpp_print_elements',
        questionType: 'code',
        question: 'Fix this C++ function so it prints each array element once. Correct the element count and remove the extra increment inside the subscript.',
        language: 'cpp',
        filename: 'phantom_memory.cpp',
        hint: 'sizeof on an array is bytes, and i++ inside arr[i++] skips elements.',
        starterCode: '#include <iostream>\nusing namespace std;\n\nvoid print_elements() {\n    int arr[] = {1, 2, 3, 4, 5};\n    int limit = sizeof(arr);\n    \n    for (int i = 0; i < limit; i++) {\n        cout << arr[i++] << " ";\n    }\n}'
      },
      {
        questionKey: 's2_q5_c_is_sorted',
        questionType: 'code',
        question: 'Fix this C function so it correctly checks whether an array of n integers is sorted in non-decreasing order, without reading past the last valid index.',
        language: 'c',
        filename: 'monster_sort_check.c',
        hint: 'The loop bound must stop before the last pair so arr[i + 1] stays in range.',
        starterCode: '#include <stdio.h>\nint is_sorted(int arr[], int n) {\n    for (int i = 0; i <= n; i++) {\n        if (arr[i] > arr[i + 1]) {\n            return 0;\n        }\n    }\n    return 1;\n}'
      }
    ]
  },
  {
    title: 'DSA After Dark',
    topics: 'ANAGRAMS · SORTING · STACKS · STABILITY',
    briefing: "You have entered the Phantom's algorithmic maze. Every path looks correct until it isn't. Every decision has a consequence. Think carefully, because one wrong answer could leave you trapped in an endless loop.",
    whisper: 'UNKNOWN: The shortest path is not always the safest.',
    type: 'mcq',
    questions: [
      {
        questionKey: 's3_q1_anagram_complexity',
        questionType: 'mcq',
        question: 'Kapidhwaj Innovations has just deployed the backend for a brand-new Ghostbnb platform. The system needs to quickly check if a newly listed haunted house ID string (S1) is a valid anagram of a verified paranormal zone hash (S2). Assuming both strings consist of lowercase English letters and have a length of N, what is the optimal time complexity to determine if they are anagrams?',
        options: [
          'O(N^2) using nested loops',
          'O(N) using a character frequency hash map/array (or O(N log N) by sorting)',
          'O(2^N) using recursive backtracking',
          'O(1) constant time using bitwise XOR'
        ]
      },
      {
        questionKey: 's3_q2_golmaal_laxman',
        questionType: 'predict_output',
        question: 'In Golmaal Again (Golmaal 4), which character’s body gets possessed by the spirit of Damini?',
        language: 'text',
        hint: 'Name the possessed character (actor credit is optional).',
        codeSnippet: 'Film: Golmaal Again (Golmaal 4)\nClue: Damini’s spirit possesses one of the four friends.'
      },
      {
        questionKey: 's3_q3_bubble_sort_best_case',
        questionType: 'mcq',
        question: 'Part 1: Which sorting algorithm repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order?\n\nPart 2: What is the best-case time complexity of this algorithm when an early-exit optimization flag is used on an array that is already sorted?',
        options: [
          'Part 1: Selection Sort | Part 2: O(N^2)',
          'Part 1: Bubble Sort | Part 2: O(N)',
          'Part 1: Insertion Sort | Part 2: O(N log N)',
          'Part 1: Bubble Sort | Part 2: O(N^2)'
        ]
      },
      {
        questionKey: 's3_q4_stack_postfix',
        questionType: 'mcq',
        question: 'Part 1: Which data structure is classically used to evaluate postfix mathematical expressions and check for balanced nested brackets in code editors?\n\nPart 2: What is the correct postfix (RPN) notation for the infix expression A + B * C?',
        options: [
          'Part 1: Queue | Part 2: A B + C *',
          'Part 1: Stack | Part 2: A B C * +',
          'Part 1: Stack | Part 2: (A + B) * C',
          'Part 1: Hash Map | Part 2: A B + C *'
        ]
      },
      {
        questionKey: 's3_q5_stable_sort_quicksort',
        questionType: 'mcq',
        question: 'Part 1: What property defines a stable sorting algorithm?\n\nPart 2: Which of the following is a classic example of an unstable sorting algorithm?',
        options: [
          'Part 1: It guarantees O(N log N) time | Part 2: Merge Sort',
          'Part 1: It preserves the relative order of duplicate elements | Part 2: Quick Sort',
          'Part 1: It requires zero extra memory space | Part 2: Insertion Sort',
          'Part 1: It works without comparing elements directly | Part 2: Bubble Sort'
        ]
      }
    ]
  },
  {
    title: 'Predict the Output',
    topics: 'OUTPUT TRACING · PYTHON · C++ · C',
    briefing: 'The final seal is different. You cannot fix the code. You cannot change the logic. You can only predict what happens next. Read every line. Type the exact output produced by the program into the terminal prompt.',
    whisper: 'UNKNOWN: No edits. No escape. Tell me what prints to the screen.',
    type: 'predict_output',
    questions: [
      {
        questionKey: 's4_q1_py_even_sum',
        questionType: 'predict_output',
        question: 'What is the output of the following Python code?',
        language: 'python',
        codeSnippet: 'total = 0\nfor i in range(1, 5):\n    if i % 2 == 0:\n        total += i\nprint(total)',
        hint: 'range(1, 5) is 1 through 4. Add the even values.'
      },
      {
        questionKey: 's4_q2_bulbbul_ulte_pair',
        questionType: 'predict_output',
        question: 'In the movie Bulbbul, what physical trait/sign was traditionally used by village folk to identify a Chudail?',
        language: 'text',
        codeSnippet: 'Film: Bulbbul\nClue: Village folk used a physical sign to identify a Chudail.',
        hint: 'Think inverted or backward feet — ulte pair.'
      },
      {
        questionKey: 's4_q3_cpp_nested_sum',
        questionType: 'predict_output',
        question: 'Trace the nested C++ loops and predict the exact printed output.',
        language: 'cpp',
        codeSnippet: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int sum = 0;\n    for (int i = 1; i <= 3; i++) {\n        for (int j = 1; j <= i; j++) {\n            sum += (i + j);\n        }\n    }\n    cout << sum;\n    return 0;\n}',
        hint: 'Trace every (i + j) added by the nested loops.'
      },
      {
        questionKey: 's4_q4_py_slice_supernatural',
        questionType: 'predict_output',
        question: 'What is printed by this Python slicing snippet?',
        language: 'python',
        codeSnippet: 's = "SUPERNATURAL"\nprint(s[7:1:-2])',
        hint: 'Start at index 7, step -2, and stop before index 1.'
      },
      {
        questionKey: 's4_q5_c_post_increment',
        questionType: 'predict_output',
        question: 'What is the output of this C program?',
        language: 'c',
        codeSnippet: '#include <stdio.h>\n\nint main() {\n    int x = 5;\n    int y = x++;\n    printf("%d %d", x, y);\n    return 0;\n}',
        hint: 'x++ assigns first, then increments. printf prints x then y.'
      }
    ]
  }
];
