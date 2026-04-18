import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Login from './pages/Login';
import CreateQuiz from './pages/CreateQuiz';
import AddQuestions from './pages/AddQuestions';
import AdminLobby from './pages/AdminLobby';
import JoinQuiz from './pages/JoinQuiz';
import PlayerLobby from './pages/PlayerLobby';
import QuizPlay from './pages/QuizPlay';
import Results from './pages/Results';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-quiz" element={<CreateQuiz />} />
          <Route path="/quiz/:id/questions" element={<AddQuestions />} />
          <Route path="/quiz/:id/lobby" element={<AdminLobby />} />
          <Route path="/join" element={<JoinQuiz />} />
          <Route path="/quiz/:id/waiting" element={<PlayerLobby />} />
          <Route path="/quiz/:id/play" element={<QuizPlay />} />
          <Route path="/quiz/:id/results" element={<Results />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
