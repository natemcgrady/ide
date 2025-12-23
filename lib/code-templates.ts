const JAVASCRIPT = `// JavaScript Example
  function greet(name) {
    return \`Hello, \${name}!\`;
  }
  
  console.log(greet('World'));
  console.log('Welcome to the Interview IDE');
  `

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

const GO = `// Go Example
  package main
  
  import "fmt"
  
  func greet(name string) string {
      return fmt.Sprintf("Hello, %s!", name)
  }
  
  func main() {
      fmt.Println(greet("World"))
      fmt.Println("Welcome to the Interview IDE")
  }
  `

const languageTemplates = {
  javascript: JAVASCRIPT,
  typescript: TYPESCRIPT,
  python: PYTHON,
  go: GO,
};

export default languageTemplates;