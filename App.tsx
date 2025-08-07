
import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, useParams, useNavigate, Link } from 'react-router-dom';
import { works } from './data';
import { Work, Excerpt, UserAnswers, AnswerData, Question, UserAnswer } from './types';
import { BookOpenIcon, CheckCircleIcon, ArrowRightIcon, AlertTriangleIcon, TrophyIcon, ClockIcon, CalendarIcon, ChevronDownIcon, XCircleIcon, TrashIcon } from './components/icons';

// --- Context for Managing Answers ---
interface AnswersContextType {
  answers: UserAnswers;
  saveAnswers: (workId: string, excerptId: number, userAnswers: { [key: string]: UserAnswer }, studyTime: number) => void;
  getAttemptCount: (workId:string, excerptId: number) => number;
  clearAllAnswers: () => void;
}

const AnswersContext = createContext<AnswersContextType | null>(null);

const useAnswers = () => {
  const context = useContext(AnswersContext);
  if (!context) {
    throw new Error('useAnswers must be used within an AnswersProvider');
  }
  return context;
};

// --- Helper Functions & Components ---

const formatTime = (totalSeconds: number): string => {
    if (totalSeconds < 0) totalSeconds = 0;
    if (totalSeconds < 60) return `${totalSeconds}秒`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}分${seconds}秒`;
};

const Annotation = ({ text, note }: { text: string; note: string }) => (
    <span className="relative group">
      <span className="text-blue-600 font-bold cursor-pointer underline decoration-dotted decoration-blue-600/50">{text}</span>
      <span className="absolute bottom-full mb-2 w-64 bg-slate-800 text-white text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 left-1/2 -translate-x-1/2">
        {note}
        <svg className="absolute text-slate-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
          <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
        </svg>
      </span>
    </span>
);

const renderTextWithAnnotations = (text: string, notes: Record<string, string>) => {
    const parts = text.split(/(※\d+)/g);
    return parts.map((part, index) => {
        if (part.match(/※\d+/) && notes[part.replace('※', '')]) {
            const noteKey = part.replace('※', '');
            return <Annotation key={index} text={part} note={notes[noteKey]} />;
        }
        return part;
    });
};

const getScore = (excerpt: Excerpt, answerData: AnswerData) => {
    if (!excerpt || !answerData) return { correct: 0, total: 0, results: [] };
  
    let correctCount = 0;
    const results = excerpt.questions.map((q, index) => {
      const userAnswer = answerData.answers[index];
      let isCorrect = false;
  
      if (userAnswer === undefined) {
          return { isCorrect, userAnswer: "", correctAnswer: q.a };
      }
  
      switch (q.type) {
        case 'multiple-choice':
          isCorrect = userAnswer === q.a;
          break;
        case 'extraction':
          if (Array.isArray(q.a)) {
            isCorrect = typeof userAnswer === 'string' && q.a.map(a => a.trim()).includes(userAnswer.trim());
          } else {
            isCorrect = typeof userAnswer === 'string' && userAnswer.trim() === q.a;
          }
          break;
        case 'fill-in-the-blank':
          if (Array.isArray(userAnswer) && Array.isArray(q.a) && userAnswer.length === q.a.length) {
            isCorrect = userAnswer.every((ans, i) => typeof ans === 'string' && ans.trim() === q.a[i]);
          }
          break;
      }
      
      if (isCorrect) correctCount++;
      return { isCorrect, userAnswer, correctAnswer: q.a };
    });
  
    return { correct: correctCount, total: excerpt.questions.length, results };
}

// --- Page Components ---

const HomePage = () => {
    const { getAttemptCount } = useAnswers();
    const navigate = useNavigate();

    const getCompletionPercentage = (work: Work) => {
        if (work.excerpts.length === 0) return 0;
        const completedCount = work.excerpts.filter(e => getAttemptCount(work.id, e.id) > 0).length;
        return (completedCount / work.excerpts.length) * 100;
    };
    
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-bold text-slate-800">読解トレーニング</h1>
                <p className="text-slate-600 mt-2">青空文庫の名作で、国語の力を伸ばそう。</p>
                 <div className="mt-6">
                    <Link to="/records" className="inline-flex items-center justify-center bg-white text-slate-700 font-bold py-2 px-6 rounded-lg shadow-md hover:bg-slate-50 transition-colors duration-300">
                        <TrophyIcon className="h-5 w-5 mr-2 text-amber-500" />
                        学習記録を見る
                    </Link>
                </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {works.map((work) => {
                    const percentage = getCompletionPercentage(work);
                    return (
                        <div key={work.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                           <div className="p-6">
                               <div className="flex items-center mb-4">
                                   <BookOpenIcon className="h-8 w-8 text-sky-500 mr-3"/>
                                   <div>
                                       <p className="text-sm font-semibold text-slate-500">{work.author}</p>
                                       <h2 className="text-xl font-bold text-slate-900">{work.title}</h2>
                                   </div>
                               </div>
                               <p className="text-slate-600 text-sm mb-4 h-20">{work.description}</p>
                               <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4">
                                  <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                               </div>
                               <button onClick={() => navigate(`/work/${work.id}`)} disabled={work.excerpts.length === 0} className="w-full flex items-center justify-center bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed">
                                   {work.excerpts.length > 0 ? '挑戦する' : '準備中'}
                                   {work.excerpts.length > 0 && <ArrowRightIcon className="h-5 w-5 ml-2" />}
                               </button>
                           </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ExcerptListPage = () => {
    const { workId } = useParams<{ workId: string }>();
    const { getAttemptCount } = useAnswers();
    const work = works.find(w => w.id === workId);

    if (!work) {
        return <div className="text-center p-8">作品が見つかりません。</div>;
    }
    
    if (work.excerpts.length === 0) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
            <header className="mb-8">
                <Link to="/" className="text-sky-600 hover:underline mb-2 inline-block">&larr; 作品選択に戻る</Link>
                <p className="text-slate-500">{work.author}</p>
                <h1 className="text-3xl font-bold text-slate-800">{work.title}</h1>
            </header>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold text-slate-700 mb-4">コンテンツ準備中</h2>
              <p className="text-slate-600">この作品の抜粋と問題は現在準備中です。他の作品をお試しください。</p>
            </div>
        </div>
      );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <header className="mb-8">
                <Link to="/" className="text-sky-600 hover:underline mb-2 inline-block">&larr; 作品選択に戻る</Link>
                <p className="text-slate-500">{work.author}</p>
                <h1 className="text-3xl font-bold text-slate-800">{work.title}</h1>
            </header>
            <div className="space-y-3">
                {work.excerpts.map((excerpt, index) => {
                    const attempts = getAttemptCount(work.id, excerpt.id);
                    return (
                        <Link to={`/work/${work.id}/excerpt/${excerpt.id}`} key={excerpt.id} className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                            <div>
                                <span className="font-semibold text-slate-700">抜粋 {index + 1} / {work.excerpts.length}</span>
                                <p className="text-slate-600 text-md mt-1">{excerpt.subtitle}</p>
                            </div>
                            {attempts > 0 ? (
                                <div className="flex items-center text-green-600 flex-shrink-0 ml-4">
                                    <CheckCircleIcon className="h-6 w-6 mr-1" />
                                    <span className="font-bold">{attempts}回 挑戦済</span>
                                </div>
                            ) : (
                               <div className="flex items-center text-slate-400 flex-shrink-0 ml-4">
                                    <span className="mr-2">未挑戦</span>
                                    <ArrowRightIcon className="h-5 w-5" />
                               </div>
                            )}
                        </Link>
                    )
                })}
            </div>
        </div>
    );
};

// --- Add a shuffle utility function ---
const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
};

type ShuffledQuestion = Question & { originalIndex: number };


const QuizPage = () => {
    const { workId, excerptId } = useParams<{ workId: string, excerptId: string }>();
    const navigate = useNavigate();
    const { saveAnswers } = useAnswers();

    const work = useMemo(() => works.find(w => w.id === workId), [workId]);
    const excerpt = useMemo(() => work?.excerpts.find(e => e.id.toString() === excerptId), [work, excerptId]);
    const excerptIndex = useMemo(() => work?.excerpts.findIndex(e => e.id.toString() === excerptId) ?? -1, [work, excerptId]);

    // --- State for the new quiz flow ---
    const [userAnswers, setUserAnswers] = useState<{ [key: string]: UserAnswer }>({});
    const [shuffledQuestions, setShuffledQuestions] = useState<ShuffledQuestion[]>([]);
    const [startTime, setStartTime] = useState(0);
    const [attemptNumber, setAttemptNumber] = useState(0); // How many times the user has clicked "grade"
    const [questionStates, setQuestionStates] = useState<{ [key: string]: 'unanswered' | 'correct' | 'incorrect' }>({});

    // --- Effects ---
    useEffect(() => {
        if (excerpt) {
            // Shuffle questions and options
            const questionsWithOriginalIndex = excerpt.questions.map((q, index) => ({ ...q, originalIndex: index }));
            const shuffled = shuffleArray(questionsWithOriginalIndex);
            const questionsWithShuffledOptions = shuffled.map(q =>
                (q.type === 'multiple-choice' && q.options) ? { ...q, options: shuffleArray(q.options) } : q
            );
            setShuffledQuestions(questionsWithShuffledOptions);

            // Initialize answers and question states
            const initialAnswers: { [key: string]: UserAnswer } = {};
            const initialStates: { [key: string]: 'unanswered' } = {};
            questionsWithShuffledOptions.forEach((q, i) => {
                initialStates[i] = 'unanswered';
                if (q.type === 'fill-in-the-blank' && Array.isArray(q.a)) {
                    initialAnswers[i] = Array(q.a.length).fill('');
                } else {
                    initialAnswers[i] = '';
                }
            });
            setUserAnswers(initialAnswers);
            setQuestionStates(initialStates);
            setAttemptNumber(0);
            setStartTime(Date.now());
        }
    }, [excerpt]);

    // --- Helper Functions ---
    const handleAnswerChange = (displayIndex: number, value: UserAnswer, blankIndex?: number) => {
        setUserAnswers(prev => {
            const newAnswers = { ...prev };
            const question = shuffledQuestions[displayIndex];

            if (question.type === 'fill-in-the-blank') {
                const currentAnswerArray = Array.isArray(newAnswers[displayIndex]) ? [...newAnswers[displayIndex] as string[]] : [];
                if (typeof value === 'string' && blankIndex !== undefined) {
                    currentAnswerArray[blankIndex] = value;
                }
                newAnswers[displayIndex] = currentAnswerArray;
            } else {
                newAnswers[displayIndex] = value;
            }
            return newAnswers;
        });
    };

    const checkAnswerCorrectness = (question: Question, userAnswer: UserAnswer): boolean => {
        switch (question.type) {
            case 'multiple-choice':
                return userAnswer === question.a;
            case 'extraction':
                if (Array.isArray(question.a)) {
                    return typeof userAnswer === 'string' && question.a.map(a => a.trim()).includes(userAnswer.trim());
                } else {
                    return typeof userAnswer === 'string' && userAnswer.trim() === question.a;
                }
            case 'fill-in-the-blank':
                if (Array.isArray(userAnswer) && Array.isArray(question.a) && userAnswer.length === question.a.length) {
                    return userAnswer.every((ans, i) => typeof ans === 'string' && ans.trim() === question.a[i]);
                }
                return false;
            default:
                return false;
        }
    };

    // --- Derived State ---
    const areAllInputsFilled = useMemo(() => {
        if (!shuffledQuestions.length) return false;
        return shuffledQuestions.every((q, index) => {
            if (questionStates[index] === 'correct') {
                return true; // Already correct, no need to fill
            }
            const answer = userAnswers[index];
            if (q.type === 'fill-in-the-blank') {
                return Array.isArray(answer) && answer.every(a => typeof a === 'string' && a.trim() !== '');
            }
            return typeof answer === 'string' && answer.trim() !== '';
        });
    }, [userAnswers, questionStates, shuffledQuestions]);

    const isFinished = useMemo(() => {
        if (attemptNumber === 0) return false;
        const allCorrect = shuffledQuestions.every((_, i) => questionStates[i] === 'correct');
        return allCorrect || attemptNumber >= 3;
    }, [attemptNumber, questionStates, shuffledQuestions]);

    // --- Main Actions ---
    const handleGradeAnswers = () => {
        const newStates = { ...questionStates };
        const newAnswers = { ...userAnswers };

        shuffledQuestions.forEach((q, index) => {
            if (newStates[index] !== 'correct') { // Only grade non-correct questions
                const isCorrect = checkAnswerCorrectness(q, userAnswers[index]);
                newStates[index] = isCorrect ? 'correct' : 'incorrect';
                
                // If incorrect, reset the user's answer for that question for the next attempt
                if (!isCorrect) {
                    if (q.type === 'fill-in-the-blank' && Array.isArray(q.a)) {
                        newAnswers[index] = Array(q.a.length).fill('');
                    } else {
                        newAnswers[index] = '';
                    }
                }
            }
        });
        
        setQuestionStates(newStates);
        setUserAnswers(newAnswers);
        setAttemptNumber(prev => prev + 1);
    };

    const handleFinishQuiz = () => {
        const orderedAnswers: { [key: string]: UserAnswer } = {};
        shuffledQuestions.forEach((q, displayIndex) => {
            orderedAnswers[q.originalIndex] = userAnswers[displayIndex] || (q.type === 'fill-in-the-blank' ? [] : '');
        });

        const studyTimeInSeconds = Math.round((Date.now() - startTime) / 1000);
        saveAnswers(work.id, excerpt.id, orderedAnswers, studyTimeInSeconds > 0 ? studyTimeInSeconds : 1);
        navigate(`/work/${workId}/excerpt/${excerptId}/result`);
    };

    const getStatusBorderColor = (status: 'unanswered' | 'correct' | 'incorrect') => {
        if (attemptNumber === 0) return 'border-transparent';
        switch (status) {
            case 'correct': return 'border-green-500';
            case 'incorrect': return 'border-red-500';
            default: return 'border-transparent';
        }
    };
    
    // --- Render ---
    if (!work || !excerpt) {
        return <div className="text-center p-8">問題が見つかりません。</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <header className="mb-6 border-b pb-4">
                 <Link to={`/work/${work.id}`} className="text-sky-600 hover:underline mb-2 inline-block">&larr; 抜粋選択に戻る</Link>
                 <h1 className="text-2xl font-bold text-slate-800">{work.title}</h1>
                <p className="text-lg text-slate-600 mt-1">抜粋 {excerptIndex !== -1 ? excerptIndex + 1 : ''} / {work.excerpts.length}：{excerpt.subtitle}</p>
            </header>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-bold mb-4 text-slate-700">本文</h2>
                <p className="text-slate-800 leading-loose whitespace-pre-wrap">
                    {renderTextWithAnnotations(excerpt.text, excerpt.notes)}
                </p>
                {Object.keys(excerpt.notes).length > 0 &&
                    <div className="mt-6 border-t pt-4">
                        <h3 className="font-semibold text-slate-600 mb-2">注釈</h3>
                        <ul className="list-disc list-inside text-sm text-slate-600">
                            {Object.entries(excerpt.notes).map(([key, value]) => (
                                <li key={key}><span className="font-bold">※{key}:</span> {value}</li>
                            ))}
                        </ul>
                    </div>
                }
            </div>

            <div className="space-y-6">
                {shuffledQuestions.map((q, index) => {
                    const status = questionStates[index] || 'unanswered';
                    const isLocked = status === 'correct';

                    return (
                        <div key={q.originalIndex} className={`bg-white p-6 rounded-lg shadow-md border-l-4 transition-colors ${getStatusBorderColor(status)}`}>
                            <p className="block text-lg font-semibold text-slate-800 mb-3">
                                問 {index + 1}: {q.q}
                            </p>
                            
                            {q.type === 'multiple-choice' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                    {q.options?.map(option => {
                                        const isSelected = userAnswers[index] === option;
                                        return (
                                            <button 
                                                key={option} 
                                                onClick={() => handleAnswerChange(index, option)}
                                                disabled={isLocked}
                                                className={`p-3 rounded-lg text-left transition-all duration-200 border-2 disabled:opacity-70 disabled:cursor-not-allowed ${isSelected ? 'bg-sky-500 border-sky-600 text-white font-bold shadow-md' : 'bg-slate-100 hover:bg-sky-100 hover:border-sky-300 border-slate-200'}`}
                                            >
                                                {option}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {q.type === 'extraction' && (
                                <input
                                    type="text"
                                    value={(userAnswers[index] as string) || ''}
                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                    disabled={isLocked}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:bg-slate-100"
                                    placeholder="本文から抜き出して入力"
                                />
                            )}
                            {q.type === 'fill-in-the-blank' && Array.isArray(q.a) && (
                                <div className="flex flex-wrap gap-4 items-center mt-4">
                                    {q.a.map((_, blankIndex) => (
                                        <input
                                            key={blankIndex}
                                            type="text"
                                            value={((userAnswers[index] as string[]) || [])[blankIndex] || ''}
                                            onChange={(e) => handleAnswerChange(index, e.target.value, blankIndex)}
                                            disabled={isLocked}
                                            className="flex-grow p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:bg-slate-100"
                                            placeholder={`空欄${blankIndex + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-8 text-center">
                {isFinished ? (
                    <button
                        onClick={handleFinishQuiz}
                        className="w-full md:w-auto bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-green-700 transition-all duration-300"
                    >
                        最終結果を見る
                    </button>
                ) : (
                    <button
                        onClick={handleGradeAnswers}
                        disabled={!areAllInputsFilled}
                        className="w-full md:w-auto bg-sky-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        {attemptNumber === 0 ? '採点する' : '再採点する'}
                    </button>
                )}
            </div>
        </div>
    );
};

const ResultPage = () => {
    const { workId, excerptId } = useParams<{ workId: string, excerptId: string }>();
    const { answers } = useAnswers();
    const navigate = useNavigate();
    
    const work = useMemo(() => works.find(w => w.id === workId), [workId]);
    const excerpt = useMemo(() => work?.excerpts.find(e => e.id.toString() === excerptId), [work, excerptId]);
    
    const answerAttempts = (workId && excerptId) ? answers[workId]?.[excerptId] : [];
    const answerData = answerAttempts && answerAttempts.length > 0 ? answerAttempts[answerAttempts.length - 1] : undefined;

    const { correct, total, results } = useMemo(() => {
        if (!excerpt || !answerData) return { correct: 0, total: 0, results: [] };
        return getScore(excerpt, answerData);
    }, [excerpt, answerData]);

    if (!work || !excerpt || !answerData) {
        return (
          <div className="text-center p-8">
            <p className="mb-4">解答データが見つかりません。クイズを先に完了してください。</p>
            <Link to="/" className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600">トップに戻る</Link>
          </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <header className="text-center mb-8">
                 <h1 className="text-3xl font-bold text-slate-800">答え合わせ</h1>
                 <p className="text-lg text-slate-600 mt-1">{work.title} - {excerpt.subtitle}</p>
            </header>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 text-center">
                <p className="text-slate-600">結果</p>
                <p className="text-6xl font-bold text-sky-600 my-2">
                    {correct}<span className="text-3xl text-slate-500 font-medium"> / {total} 問</span>
                </p>
                <p className="text-2xl font-semibold text-amber-500">
                     { correct === total ? '素晴らしい、全問正解です！' : 'よくがんばりました！'}
                </p>
            </div>
            
            <div className="space-y-6">
                {excerpt.questions.map((q, index) => {
                    const result = results[index];
                    if (!result) return null;
                    const { isCorrect, userAnswer, correctAnswer } = result;
                    
                    const formatAnswer = (ans: UserAnswer) => Array.isArray(ans) ? ans.join(', ') : ans;

                    return (
                        <div key={index} className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                            <div className="p-4 bg-slate-50 border-b flex justify-between items-start">
                                <p className="font-bold text-slate-800 flex-grow">問 {index + 1}: {q.q}</p>
                                {isCorrect ? 
                                    <CheckCircleIcon className="h-8 w-8 text-green-500 flex-shrink-0 ml-4" /> : 
                                    <XCircleIcon className="h-8 w-8 text-red-500 flex-shrink-0 ml-4" />}
                            </div>
                            <div className="p-4 space-y-3">
                                <div >
                                    <h3 className="font-semibold text-blue-700 mb-1">あなたの解答</h3>
                                    <p className="text-slate-700 whitespace-pre-wrap p-3 bg-blue-50 rounded-md">{formatAnswer(userAnswer) || "（無解答）"}</p>
                                </div>
                                {!isCorrect && (
                                    <div>
                                        <h3 className="font-semibold text-green-800 mb-1">模範解答</h3>
                                        <p className="text-slate-800 whitespace-pre-wrap p-3 bg-green-50 rounded-md">{formatAnswer(correctAnswer)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-10 text-center">
                <button
                    onClick={() => navigate(`/work/${workId}/excerpt/${excerptId}/submission`)}
                    className="w-full md:w-auto bg-sky-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-sky-700 transition-colors text-lg"
                >
                    結果を記録して終了する
                </button>
            </div>
        </div>
    );
};

const SubmissionPage = () => {
    const { workId, excerptId } = useParams<{ workId: string; excerptId: string }>();
    const { answers } = useAnswers();
    const navigate = useNavigate();

    const work = useMemo(() => works.find(w => w.id === workId), [workId]);
    const excerpt = useMemo(() => work?.excerpts.find(e => e.id.toString() === excerptId), [work, excerptId]);
    
    const answerAttempts = (workId && excerptId) ? answers[workId]?.[excerptId] : [];
    const answerData = answerAttempts && answerAttempts.length > 0 ? answerAttempts[answerAttempts.length - 1] : undefined;

    const { correct, total } = useMemo(() => {
        if (!excerpt || !answerData) return { correct: 0, total: 0 };
        return getScore(excerpt, answerData);
    }, [excerpt, answerData]);
    
    if (!work || !excerpt || !answerData) {
        return (
          <div className="text-center p-8">
            <p className="mb-4">提出データが見つかりません。クイズを先に完了してください。</p>
            <Link to="/" className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600">トップに戻る</Link>
          </div>
        );
    }
    
    const { studyTime } = answerData;

    return (
        <div className="bg-slate-50 min-h-screen py-8">
            <div className="max-w-md mx-auto px-4">
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <header className="text-center border-b pb-4 mb-4">
                        <TrophyIcon className="h-12 w-12 mx-auto text-amber-500 mb-2"/>
                        <h1 className="text-2xl font-bold text-slate-800">学習完了</h1>
                        <p className="text-sm text-slate-500">お疲れ様でした！</p>
                    </header>

                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-slate-700">{work.title}</h2>
                        <p className="text-md text-slate-600">{excerpt.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-sky-50 p-4 rounded-lg">
                            <p className="text-sm text-sky-800 font-semibold">勉強時間</p>
                            <p className="text-2xl font-bold text-sky-700">
                                {formatTime(studyTime)}
                            </p>
                             <p className="text-xs text-slate-500">({studyTime}秒)</p>
                        </div>
                         <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-green-800 font-semibold">正解数</p>
                            <p className="text-2xl font-bold text-green-700">
                                {correct} / {total} 問
                            </p>
                            <p className="text-xs text-slate-500">
                                正答率 {total > 0 ? Math.round((correct/total)*100) : 0}%
                            </p>
                        </div>
                    </div>
                    
                    <div className="mt-8 text-center text-xs text-slate-500">
                        <p>この画面をスクリーンショットして報告しましょう！</p>
                    </div>
                </div>
                
                <div className="mt-8 text-center">
                    <button onClick={() => navigate(`/work/${workId}`)} className="bg-slate-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 transition-colors">
                        抜粋選択に戻る
                    </button>
                </div>
            </div>
        </div>
    );
};

const RecordsPage = () => {
    const { answers, clearAllAnswers } = useAnswers();
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ today: true });
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const confirmationTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        // Cleanup timeout on component unmount
        return () => {
            if (confirmationTimeoutRef.current) {
                clearTimeout(confirmationTimeoutRef.current);
            }
        };
    }, []);

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleDeleteClick = () => {
        setIsConfirmingDelete(true);
        // Set a timer to revert the button after 2 seconds
        confirmationTimeoutRef.current = window.setTimeout(() => {
            setIsConfirmingDelete(false);
            confirmationTimeoutRef.current = null;
        }, 2000);
    };

    const handleConfirmDelete = () => {
        // Clear the timeout if it's active
        if (confirmationTimeoutRef.current) {
            clearTimeout(confirmationTimeoutRef.current);
            confirmationTimeoutRef.current = null;
        }
        clearAllAnswers();
        setIsConfirmingDelete(false); // Revert button state immediately
    };


    const categorizedAttempts = useMemo(() => {
        const allAttempts = Object.entries(answers).flatMap(([workId, excerpts]) =>
            Object.entries(excerpts).flatMap(([excerptId, attempts]) => {
                const work = works.find(w => w.id === workId);
                const excerpt = work?.excerpts.find(e => e.id.toString() === excerptId);
                
                if (!work || !excerpt) return [];

                return attempts.map(attempt => {
                    const score = getScore(excerpt, attempt);
                    return {
                        workId,
                        excerptId: Number(excerptId),
                        score,
                        ...attempt
                    };
                });
            })
        ).sort((a, b) => b.timestamp - a.timestamp);


        const categories: Record<string, { title: string; attempts: typeof allAttempts; totalTime: number }> = {
            today: { title: "今日の記録", attempts: [], totalTime: 0 },
            yesterday: { title: "昨日の記録", attempts: [], totalTime: 0 },
            sevenDays: { title: "過去7日間の記録", attempts: [], totalTime: 0 },
            thirtyDays: { title: "過去30日間の記録", attempts: [], totalTime: 0 },
            older: { title: "それより前の記録", attempts: [], totalTime: 0 },
        };

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(todayStart.getDate() - 1);
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(todayStart.getDate() - 7);
        const thirtyDaysAgo = new Date(todayStart);
        thirtyDaysAgo.setDate(todayStart.getDate() - 30);
        
        allAttempts.forEach(attempt => {
            const attemptDate = new Date(attempt.timestamp);
            let categoryKey: string;

            if (attemptDate >= todayStart) {
                categoryKey = 'today';
            } else if (attemptDate >= yesterdayStart) {
                categoryKey = 'yesterday';
            } else if (attemptDate >= sevenDaysAgo) {
                categoryKey = 'sevenDays';
            } else if (attemptDate >= thirtyDaysAgo) {
                categoryKey = 'older';
            } else {
                categoryKey = 'older';
            }
            categories[categoryKey].attempts.push(attempt);
            categories[categoryKey].totalTime += attempt.studyTime;
        });

        return Object.entries(categories).filter(([_, data]) => data.attempts.length > 0);
    }, [answers]);

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <header className="mb-8 flex justify-between items-center">
                 <div>
                    <Link to="/" className="text-sky-600 hover:underline mb-2 inline-block">&larr; トップに戻る</Link>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center">
                        <CalendarIcon className="h-8 w-8 mr-3 text-sky-500" />
                        学習記録
                    </h1>
                </div>
                {categorizedAttempts.length > 0 && (
                     <div className="relative">
                        {!isConfirmingDelete ? (
                            <button
                                onClick={handleDeleteClick}
                                className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center"
                            >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                すべての記録を削除
                            </button>
                        ) : (
                            <button
                                onClick={handleConfirmDelete}
                                className="bg-red-700 text-white font-bold py-2 px-4 rounded-lg animate-pulse"
                            >
                                本当に削除しますか？
                            </button>
                        )}
                    </div>
                )}
            </header>

            {categorizedAttempts.length === 0 ? (
                <div className="text-center bg-white p-8 rounded-lg shadow-sm">
                    <p className="text-slate-600">まだ学習記録がありません。</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {categorizedAttempts.map(([key, { title, attempts, totalTime }]) => (
                        <div key={key} className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <button
                                onClick={() => toggleSection(key)}
                                className="w-full flex justify-between items-center p-4 text-left"
                                aria-expanded={!!openSections[key]}
                            >
                                <span className="text-xl font-bold text-slate-800">{title}</span>
                                <div className="flex items-center">
                                    <span className="text-slate-600 font-semibold mr-4">合計 {formatTime(totalTime)}</span>
                                    <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform ${openSections[key] ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections[key] && (
                                <div className="border-t border-slate-200">
                                    <ul className="divide-y divide-slate-100">
                                        {attempts.map((attempt, index) => {
                                            const work = works.find(w => w.id === attempt.workId);
                                            const excerpt = work?.excerpts.find(e => e.id === attempt.excerptId);
                                            if (!work || !excerpt) return null;
                                            
                                            const attemptDate = new Date(attempt.timestamp);
                                            const dateString = attemptDate.toLocaleDateString('ja-JP');
                                            const timeString = attemptDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

                                            const { score } = attempt;

                                            return (
                                                <li key={index} className="p-4 hover:bg-slate-50">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-slate-800">{work.title}</p>
                                                            <p className="text-sm text-slate-600">{excerpt.subtitle}</p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-4">
                                                            <p className="font-semibold text-sky-600 flex items-center justify-end">
                                                                <ClockIcon className="h-4 w-4 mr-1"/>
                                                                {formatTime(attempt.studyTime)}
                                                            </p>
                                                             {key === 'today' && score && score.total > 0 && (
                                                                <p className="font-semibold text-green-600 flex items-center justify-end text-sm mt-1">
                                                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                                                    {score.correct} / {score.total} 問 ({Math.round((score.correct / score.total) * 100)}%)
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-slate-400 mt-1">{dateString} {timeString}</p>
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- Main App Component ---

const App = () => {
    const [answers, setAnswers] = useState<UserAnswers>(() => {
        try {
            const saved = localStorage.getItem('userAnswers');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error("Failed to parse answers from localStorage", error);
            return {};
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('userAnswers', JSON.stringify(answers));
        } catch (error) {
            console.error("Failed to save answers to localStorage", error);
        }
    }, [answers]);

    const saveAnswers = (workId: string, excerptId: number, userAnswers: { [key: string]: UserAnswer }, studyTime: number) => {
        const answerData: AnswerData = { 
            answers: userAnswers, 
            studyTime,
            timestamp: Date.now()
        };
        setAnswers(prev => {
            const currentWorkAnswers = prev[workId] || {};
            const existingAttempts = currentWorkAnswers[excerptId.toString()] || [];
            return {
                ...prev,
                [workId]: {
                    ...currentWorkAnswers,
                    [excerptId.toString()]: [...existingAttempts, answerData],
                },
            };
        });
    };

    const getAttemptCount = (workId: string, excerptId: number) => {
        return answers[workId]?.[excerptId.toString()]?.length || 0;
    };
    
    const clearAllAnswers = () => {
        setAnswers({});
    };

    return (
        <AnswersContext.Provider value={{ answers, saveAnswers, getAttemptCount, clearAllAnswers }}>
            <HashRouter>
                <main>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/work/:workId" element={<ExcerptListPage />} />
                        <Route path="/work/:workId/excerpt/:excerptId" element={<QuizPage />} />
                        <Route path="/work/:workId/excerpt/:excerptId/result" element={<ResultPage />} />
                        <Route path="/work/:workId/excerpt/:excerptId/submission" element={<SubmissionPage />} />
                        <Route path="/records" element={<RecordsPage />} />
                    </Routes>
                </main>
            </HashRouter>
        </AnswersContext.Provider>
    );
};

export default App;
