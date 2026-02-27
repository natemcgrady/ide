import type { Language } from '@/lib/executor';

const TYPESCRIPT = `// TypeScript Example
  function greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
  
  console.log(greet('World'));
  console.log('Welcome to the Interview IDE');
  `

const PYTHON = `# Python Example with Libraries
  import json
  from collections import defaultdict, Counter
  from datetime import datetime
  
  # You can also use: numpy, pandas, scipy, requests
  # (if installed on the server)
  
  def greet(name):
      return f"Hello, {name}!"
  
  # Example with standard library
  data = {"message": greet("World"), "timestamp": str(datetime.now())}
  print(json.dumps(data, indent=2))
  
  # Example with collections
  words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
  word_counts = Counter(words)
  print(f"\\nWord counts: {dict(word_counts)}")
  `

const languageTemplates = {
  typescript: TYPESCRIPT,
  python: PYTHON,
} satisfies Record<Language, string>;

export default languageTemplates;