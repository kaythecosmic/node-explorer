# Node Explorer Documentation

## Introduction
Node Explorer is a web application designed to explore and visualize the node structure of various datasets. This project is built using HTML, CSS, and JavaScript.

## Features
- Visualize node structures in a user-friendly interface.
- Interactive UI for exploring different nodes and their relationships.
- Real-time updates and dynamic rendering.

## Installation
### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Steps
1. Clone the `production` branch:
    ```sh
    git clone "https://github.com/kaythecosmic/node-explorer.git" -b production
    ```
2. Navigate to the project directory:
    ```sh
    cd node-explorer
    ```
3. Install dependencies:
    ```sh
    npm install
    ```
4. Install Electron Packager:
    ```sh
    npm install electron-packager
    ```
5. Package the application:
    ```sh
    electron-packager . "BIS Explorer" --platform=win32 --arch=x64
    ```

## Usage
1. Start the application:
    open the BIS Explore.exe application

## Project Structure
- `assets/`: Contains image and other static assets.
- `renders/`: Contains rendered output files.
- `main.js`: Main JavaScript file for the application.
- `package.json`: Project configuration and dependencies.
- `.gitignore`: Specifies files and directories to be ignored by Git.
- `LICENSE`: License information for the project.

## Contributing
1. Fork the repository.
2. Create a new branch:
    ```sh
    git checkout -b feature-name
    ```
3. Make your changes and commit them:
    ```sh
    git commit -m 'Add new feature'
    ```
4. Push to the branch:
    ```sh
    git push origin feature-name
    ```
5. Open a pull request.

## License
This project is licensed under the Apache-2.0 License. See the `LICENSE` file for more details.

## Contact
For any questions or issues, please open an issue on the [GitHub repository](https://github.com/kaythecosmic/node-explorer).

### Further Improvements
- Add unit tests to ensure code robustness.
- Implement CI/CD pipeline for automated testing and deployment.
