with open('shared/data.js', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if '"IN5103":' in line:
            print(f'Line {i}: {line.strip()}')
