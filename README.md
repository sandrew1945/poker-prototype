# poker-prototype

A small web page for a test of the on-site hand input of the Poker APP. The prototype has two pages: the on-site main screen (P06) and the hand input (P07).

The Human and 2 or 3 players use the prototype on a phone. The test measures the time of the on-site tasks. The project discards the prototype after the test.

The task card POKER-13 gives the requirements. The document "Poker PRD Part 2 - Hand Record and Chips" gives the design of the two pages.

## Status

The prototype is complete for the test of the card POKER-13.

## Technology

- Use only HTML, CSS, and JavaScript.
- Do not use a package, a framework, a build step, or server code.
- The unit tests use the built-in test runner of Node.js.

## Commands

| Command | Value |
|---|---|
| Build | No build step |
| Lint | No command |
| Test | `node --test` |
| Run one test | `node --test <file>`, for example `node --test tests/keyboard.test.js` |
| Start | `python3 -m http.server 8000` in the root folder of this repository |

The tests are in the folder `tests`. They use Node.js 22 or a newer version.

## Files

| File or folder | Content |
|---|---|
| `index.html` | The page. It holds all the screens of the prototype. |
| `css/style.css` | The styles |
| `js/app.js` | The entry: it keeps the state and connects the controls |
| `js/app-state.js` | The state transitions of the prototype |
| `js/keyboard.js` | The poker keyboard: the keys, the space rules, and the delete key |
| `js/measurement.js` | The measurement: the time, the user actions, the typed fields, and the key presses |
| `js/results.js` | The result rows, the median time, and the text of the results |
| `js/session-plan.js` | The tasks of a test session and the example hands |
| `js/tournament.js`, `js/positions.js`, `js/amount.js`, `js/labels.js` | The sample tournament, the positions, the conversion bar, and the text of the pages |
| `js/storage.js` | The browser storage |
| `js/ui/` | The code that shows the pages |
| `tests/` | The unit tests |

## Start procedure

The phone and the computer must be in the same Wi-Fi network. The prototype must not be on an Internet host.

1. On the computer, open a terminal in the root folder of this repository.
2. Start the local web server: `python3 -m http.server 8000`.
3. Find the IP address of the computer. On a Mac, use the command `ipconfig getifaddr en0`.
4. On the phone, open Safari (iOS) or Chrome (Android).
5. Open the address `http://<IP address>:8000/`, for example `http://192.168.1.20:8000/`.
6. Hold the phone in portrait.

Notes:

- After the page loads, the prototype operates with no network. It sends no data to a server.
- If the phone does not open the page, make sure that the firewall of the computer accepts connections to Python.
- To stop the server, push Ctrl+C in the terminal.

## Test procedure

The Human and 2 or 3 players do the test. Each player uses the same phone or a phone of their own.

### Tasks of a test session

A test session has 4 tasks in this order:

| No. | Task | Test hand |
|---|---|---|
| 1 | T08: record a fold or skip a hand | A fold with unknown hole cards |
| 2 | T09: quick record of a hand and save | Example hand 1: `AKo r2.5bb BB c` |
| 3 | T09 | Example hand 2: `AQs r BB c / Q72 BB x b1200 BB f` |
| 4 | T09 | Example hand 3: `A♠K♦ r1k BTN c / K♥7♠2♦ b1200 BTN c / 5♣ b3k BTN c / 9♥ x BTN x / BTN K♣Q♣` |

- Tasks 1 and 2 are the test path 2 of section 22 of the page "Product Concept" (T08, then T09).
- Task 2 is also the task T09 of the test path 1. The other tasks of the test path 1 are not on the pages P06 and P07.
- Section 4.3 of Part 2 gives the example hands.

### Procedure for each player

1. Open the prototype on the phone.
2. Write a label in the field "测试标签", for example "Player A practice". Do not write a name or other personal data.
3. Tap 「开始测试」.
4. Read the test hand on the task card.
5. Tap 「开始」. The prototype shows P06. The test hand stays at the top of the screen.
6. Do the task.
7. Do steps 4 to 6 for each task. After the last task, the prototype shows the results page.

Do one practice session before the measured session:

1. Do a full session with a label that ends with "practice".
2. Tap 「返回首页」.
3. Do a second session with a label that ends with "measured".

### Measurement

The prototype measures each task:

- T08: the time starts when the prototype shows P06. The time stops at the tap.
- T09: the time starts at the first user action, for example the tap on 「记一手」. The time stops at the tap on 「保存」.
- One user action is one tap, or one typed field (Part 1, section 1.2).
- One key press is one press of a key in the shorthand box. This includes the shortcut keys and the delete key.
- If the player leaves P07 before the save, the task gets the result "stopped". The prototype keeps the input as Part 2 says.

### Pass condition

- The test passes if the time of the task T09 for example hand 1 is 30 seconds or less (decision D8).
- For example hands 2 and 3, the results show the time and the comparison with the limit. These results are data for the Human. They are not a pass condition.
- If the task T09 for example hand 1 is not in the limit, write a comment on the card POKER-9 with the results. Then drag POKER-9 back to To design.

### Copy the results into the card POKER-13

1. On the home page, tap 「查看结果」. Or use the results page after the last task.
2. Tap 「复制全部结果」. The prototype copies the results of all sessions as text.
3. If the copy fails, touch and hold the text in the box "结果文本". Then select all the text and copy it.
4. Paste the text into a comment on the card POKER-13 in Notion. You can use the Notion app on the phone. You can also send the text to the computer.

The results stay in the browser of the phone until you delete them. To delete them, tap 「删除全部结果」 on the results page.

## Free mode

Tap 「自由试用」 on the home page to use P06 and P07 with no measurement. Tap the back control of P06 to go back to the home page.

## Branches

| Branch | Content | Made from | Merges into |
|---|---|---|---|
| `master` | The stable version | - | - |
| `dev` | The development version | `master` | `master` |
| `develop/<Task ID>` | One new feature | `dev` | `dev`, through a pull request |
| `hotfix/<Task ID>` | One fix of a bug in the stable version | `master` | `master` and `dev`, through two pull requests |

Do not commit directly to `master` or `dev`. The file `CLAUDE.md` in the workspace folder (the parent folder of this repository) gives the full rules.
