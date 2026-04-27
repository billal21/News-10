# Run and Deploy Instructions for News-10

## Local Setup
1. **Clone the repository:**  
   ```bash
   git clone https://github.com/billal21/News-10.git
   cd News-10
   ```  
2. **Install dependencies:**  
   Depending on your package manager, run:  
   ```bash
   npm install
   ```  
   or  
   ```bash
   yarn install
   ```  

3. **Environment Variables:**  
   Create a `.env` file in the root directory based on the provided `.env.example` file. Ensure you set the necessary API keys and secrets.

## Build Commands
- To build the project, run:  
   ```bash
   npm run build
   ```  
   or  
   ```bash
   yarn build
   ```

## Deployment Options

### Vercel
1. **Sign Up/Log In:** Log in to your Vercel account at [vercel.com](https://vercel.com).
2. **Import Project:** Click on ‘New Project’ and import your GitHub repository.
3. **Configure Environment Variables:** Set any necessary environment variables in Vercel that you placed in your `.env` file.
4. **Deploy:** Vercel will automatically build and deploy your project on push.

### Google Cloud Run
1. **Build the Container:**  
   First, ensure that you are logged in to Google Cloud SDK and your project is set. Then run:  
   ```bash
   gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/news-10
   ```  
2. **Deploy to Cloud Run:**  
   ```bash
   gcloud run deploy news-10 --image gcr.io/[YOUR_PROJECT_ID]/news-10 --platform managed
   ```  
3. **Set Environment Variables:** Make sure to set any required environment variables during deployment.

### Other Platforms
- For platforms like Heroku, AWS, etc., follow their respective deployment guides. Ensure that all necessary dependencies and environment variables are properly configured.

## Additional Notes
- Always check the specific documentation for any services you are using to ensure proper configurations and best practices for deployment.