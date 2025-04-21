// src/data/assistantQuestions.js

export const intricacyLevels = [
  {
    value: 1,
    name: 'Level 1: Basic',
    description:
      'Covers core Role, Task, Context, and Format. Ideal for quicker creation of simpler assistants.',
  },
  {
    value: 2,
    name: 'Level 2: Intermediate',
    description:
      'Adds Tone, Examples, Detail Level, Things to Avoid, and Audience. For assistants needing more specific guidance.',
  },
  {
    value: 3,
    name: 'Level 3: Advanced',
    description:
      'Most comprehensive set covering all aspects for precise behavior and handling various scenarios.',
  },
]

export const questionsByLevel = {
  1: [
    {
      text: 'What is the precise role or persona?',
      promptKey: 'Precise Role/Persona',
      help: 'Define the identity or character the assistant should adopt.',
      example: 'A helpful and friendly coding tutor specializing in Python.',
    },
    {
      text: 'What is the primary task or objective?',
      promptKey: 'Primary Task/Objective',
      help: 'What should the assistant primarily help the user accomplish?',
      example: 'To explain complex Python concepts clearly and provide working code examples.',
    },
    {
      text: 'What is the essential context or background?',
      promptKey: 'Essential Context/Background Information',
      help: 'Key information the assistant needs to know to perform its task.',
      example: 'The user is a beginner learning Python 3. Focus on core language features.',
    },
    {
      text: 'What specific output format or structure?',
      promptKey: 'Specific Output Format/Structure',
      help: 'How should the final output look? (e.g., code blocks, bullet points, specific sections)',
      example:
        'Provide explanations in clear paragraphs, followed by markdown code blocks for examples.',
    },
  ],
  2: [
    /* Level 2 Questions */
    {
      text: 'What is the precise role or persona?',
      promptKey: 'Precise Role/Persona',
      help: 'Define the identity or character the assistant should adopt.',
      example: 'A professional travel agent specializing in budget-friendly European trips.',
    },
    {
      text: 'What is the primary task or objective?',
      promptKey: 'Primary Task/Objective',
      help: 'What should the assistant primarily help the user accomplish?',
      example:
        'To create customized 1-week travel itineraries based on user preferences and budget.',
    },
    {
      text: 'What is the essential context or background?',
      promptKey: 'Essential Context/Background Information',
      help: 'Key information the assistant needs to know.',
      example:
        'Focus on travel within Schengen Area countries. Assume user prefers hostels or budget hotels.',
    },
    {
      text: 'What specific output format or structure?',
      promptKey: 'Specific Output Format/Structure',
      help: 'How should the final output look?',
      example: 'A day-by-day itinerary with suggested activities, transport, and estimated costs.',
    },
    {
      text: 'What tone and style?',
      promptKey: 'Tone and Style',
      help: 'Describe the desired communication style (e.g., formal, friendly, enthusiastic).',
      example: 'Friendly, informative, and slightly enthusiastic.',
    },
    {
      text: 'Provide one or two concrete examples of ideal output.',
      promptKey: 'Concrete Examples of Ideal Output',
      help: 'Paste or describe an example of what a good response looks like.',
      example:
        "'Day 1 (Paris): Arrive at CDG, take RER B to city center. Check into hostel near Le Marais (€30). Afternoon: Explore Le Marais, visit Place des Vosges. Evening: Budget dinner (€15), walk along the Seine.'",
    },
    {
      text: 'What is the desired level of detail/complexity?',
      promptKey: 'Desired Level of Detail/Complexity',
      help: 'How much detail should be included? (e.g., brief overview, very detailed steps)',
      example:
        'Provide moderate detail, including specific suggestions but allowing for flexibility.',
    },
    {
      text: 'Are there things to avoid?',
      promptKey: 'Things to Avoid',
      help: 'Specify any topics, phrases, or behaviors the assistant should not engage in.',
      example:
        'Avoid recommending luxury hotels or expensive fine dining. Do not suggest activities outside the specified region.',
    },
    {
      text: 'Who is the intended audience?',
      promptKey: 'Intended Audience',
      help: 'Describe the user this assistant is for.',
      example: 'Young adults or students looking for budget travel options in Europe.',
    },
  ],
  3: [
    /* Level 3 Questions */
    {
      text: 'What is the precise role or persona?',
      promptKey: 'Precise Role/Persona',
      help: 'Define the identity.',
      example: 'A meticulous technical documentation writer.',
    },
    {
      text: 'What is the primary task or objective?',
      promptKey: 'Primary Task/Objective',
      help: 'What should it do?',
      example: 'Generate API documentation based on provided code comments and specifications.',
    },
    {
      text: 'What is the essential context?',
      promptKey: 'Essential Context/Background Information',
      help: 'What background info is needed?',
      example: 'Assume input is well-commented Python code following standard conventions.',
    },
    {
      text: 'What specific output format?',
      promptKey: 'Specific Output Format/Structure',
      help: 'How should output look?',
      example: 'Markdown format with sections for Parameters, Returns, Examples.',
    },
    {
      text: 'What tone and style?',
      promptKey: 'Tone and Style',
      help: 'Communication style?',
      example: 'Formal, precise, and objective.',
    },
    {
      text: 'Provide examples of ideal output.',
      promptKey: 'Concrete Examples of Ideal Output',
      help: 'Show a good example.',
      example:
        '### FunctionName \n\n ```python\ndef FunctionName(param1: str): ...```\n\n**Parameters:**\n * `param1` (str): Description.\n\n**Returns:**\n * `str`: Description.',
    },
    {
      text: 'What is the desired level of detail?',
      promptKey: 'Desired Level of Detail/Complexity',
      help: 'How detailed?',
      example: 'Very detailed, covering all parameters and potential exceptions.',
    },
    {
      text: 'Should it explain its reasoning/steps?',
      promptKey: 'Explanation of Reasoning/Steps',
      help: 'Explain how it got the answer?',
      example: 'No, just provide the documentation.',
    },
    {
      text: 'Are there things to avoid?',
      promptKey: 'Things to Avoid',
      help: "What shouldn't it do?",
      example:
        'Avoid making assumptions about code functionality not present in comments. Do not add subjective opinions.',
    },
    {
      text: 'How should it handle follow-up questions?',
      promptKey: 'Handling Follow-up Questions',
      help: 'Responding to clarification requests?',
      example:
        'Answer based on the original context and instructions, ask for clarification if the follow-up is ambiguous.',
    },
    {
      text: 'Who is the intended audience?',
      promptKey: 'Intended Audience',
      help: 'Who is this for?',
      example: 'Other software developers using the API.',
    },
    {
      text: 'Any specific steps or order?',
      promptKey: 'Instructional Hierarchy/Order of Operations',
      help: 'Order of operations?',
      example: 'First parse parameters, then return values, then generate examples.',
    },
    {
      text: "Any absolute 'do not do' directives?",
      promptKey: 'Negative Constraints',
      help: 'Strict boundaries?',
      example:
        "Do not invent parameters or functionality. Do not include placeholder text like 'TODO'.",
    },
    {
      text: 'How should it respond to feedback/revisions?',
      promptKey: 'Iterative Refinement',
      help: 'Handling correction requests?',
      example:
        'Accept the feedback and regenerate the specific section requested, incorporating the correction.',
    },
    {
      text: 'How should it handle ambiguity?',
      promptKey: 'Handling Ambiguity',
      help: 'If the input is unclear?',
      example:
        'State that the input is ambiguous and ask for specific clarification on the unclear part.',
    },
    {
      text: 'How should it integrate context?',
      promptKey: 'Knowledge Integration',
      help: 'Prioritizing provided info?',
      example: 'Prioritize explicit comments in the code over general programming knowledge.',
    },
    {
      text: 'Should it have internal evaluation criteria?',
      promptKey: 'Output Evaluation (Internal)',
      help: 'Self-check before output?',
      example: 'Yes, check if all documented parameters have a description.',
    },
    {
      text: 'What are default behaviors if info is missing?',
      promptKey: 'Default Behaviors',
      help: 'Assumptions for missing info?',
      example: "If return type is missing, state 'Return type not specified'.",
    },
    {
      text: 'Multi-turn expected? How to remember?',
      promptKey: 'Multi-Turn Conversation',
      help: 'Remembering previous turns?',
      example: 'Yes, maintain context of the current function being documented across turns.',
    },
  ],
}
