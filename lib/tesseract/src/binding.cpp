#include <napi.h>
#include <tesseract/baseapi.h>
#include <leptonica/allheaders.h>
#include <map>
#include <vector>

// Helper struct to store word information
struct WordInfo {
    std::string text;
    int fontSize;
    std::string language;
    std::string fontName;
    std::string fontFamily;
    bool bold;
    bool italic;
    bool underlined;
    bool monospace;
    bool serif;
    bool smallcaps;
    bool isSymbol;
    float confidence;
    int lineNumber;
    int wordPosition;
    int x;          // x position
    int y;          // y position
    int width;      // width of word
    int height;     // height of word
    int pageWidth;  // width of page
    float baseline;
    bool isParagraphStart;
    bool isParagraphEnd;
};

// Helper function to sort by font size in descending order
bool compareFontSize(const std::pair<int, std::vector<WordInfo>>& a, 
                    const std::pair<int, std::vector<WordInfo>>& b) {
    return a.first > b.first;
}

std::string determineFontName(const char* lang, bool serif, bool monospace) {
    if (strcmp(lang, "khm") == 0) {
        // Common Khmer fonts
        if (serif) {
            return "Khmer OS Muol";  // For headers/titles
        } else if (monospace) {
            return "Khmer OS Fasthand";  // For special text
        } else {
            return "Khmer OS Battambang";  // Most common Khmer font
        }
    }
    // For other languages or unknown cases
    return "Unknown";
}

class KhmerFontDetector {
public:
    static std::string detectFont(const char* text, bool serif, bool bold) {
        // Common Khmer fonts
        static const std::vector<std::string> khmerFonts = {
            "Khmer OS Battambang",
            "Khmer OS Muol",
            "Khmer OS Content",
            "Khmer OS Fasthand",
            "Khmer OS Freehand",
            "Khmer OS Metal Chrieng",
            "Khmer OS Siemreap",
            "Khmer OS System"
        };

        // Add your font detection logic here
        // This could involve analyzing character shapes, spacing, etc.
        
        // For now, return based on style attributes
        if (serif && bold) {
            return "Khmer OS Muol";
        } else if (serif) {
            return "Khmer OS Siemreap";
        } else {
            return "Khmer OS Battambang";
        }
    }
};

Napi::Object AnalyzeImage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (info.Length() < 1) {
            throw Napi::Error::New(env, "Wrong number of arguments");
        }

        std::string inputFile = info[0].As<Napi::String>().Utf8Value();
        
        tesseract::TessBaseAPI *api = new tesseract::TessBaseAPI();
        Napi::Object result = Napi::Object::New(env);
        
        if (api->Init("/opt/homebrew/share/tessdata", "eng+khm", tesseract::OEM_LSTM_ONLY)) {
            throw Napi::Error::New(env, "Could not initialize tesseract.");
        }

        Pix *pix = pixRead(inputFile.c_str());
        if (!pix) {
            api->End();
            throw Napi::Error::New(env, "Cannot process input file: " + inputFile);
        }

        api->SetPageSegMode(tesseract::PSM_AUTO_OSD);
        api->SetImage(pix);
        
        if (api->Recognize(0) != 0) {
            pixDestroy(&pix);
            api->End();
            throw Napi::Error::New(env, "Error during recognition");
        }

        Napi::Array words = Napi::Array::New(env);
        int wordCount = 0;

        tesseract::ResultIterator* ri = api->GetIterator();
        if (ri != 0) {
            do {
                const char* word = ri->GetUTF8Text(tesseract::RIL_WORD);
                if (word != 0) {
                    const char *font_name;
                    bool bold, italic, underlined, monospace, serif, smallcaps;
                    int pointsize, font_id;
                    
                    font_name = ri->WordFontAttributes(&bold, &italic, &underlined,
                                                   &monospace, &serif,
                                                   &smallcaps, &pointsize,
                                                   &font_id);

                    const char* lang = ri->WordRecognitionLanguage();

                    Napi::Object wordInfo = Napi::Object::New(env);
                    wordInfo.Set("text", word);
                    wordInfo.Set("fontName", font_name ? font_name : "Unknown");
                    wordInfo.Set("fontSize", pointsize);
                    wordInfo.Set("fontId", font_id);
                    wordInfo.Set("bold", bold);
                    wordInfo.Set("italic", italic);
                    wordInfo.Set("underlined", underlined);
                    wordInfo.Set("monospace", monospace);
                    wordInfo.Set("serif", serif);
                    wordInfo.Set("smallcaps", smallcaps);
                    wordInfo.Set("language", lang ? lang : "unknown");

                    words.Set(wordCount++, wordInfo);
                    delete[] word;
                }
            } while (ri->Next(tesseract::RIL_WORD));
        }

        result.Set("words", words);

        delete ri;
        api->End();
        pixDestroy(&pix);
        
        return result;

    } catch (const std::exception& e) {
        throw Napi::Error::New(env, std::string("C++ error: ") + e.what());
    } catch (...) {
        throw Napi::Error::New(env, "Unknown C++ error occurred");
    }
}

Napi::Object AnalyzeImageGrouped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (info.Length() < 1) {
            throw Napi::Error::New(env, "Wrong number of arguments");
        }

        std::string inputFile = info[0].As<Napi::String>().Utf8Value();
        
        tesseract::TessBaseAPI *api = new tesseract::TessBaseAPI();
        Napi::Object result = Napi::Object::New(env);
        
        if (api->Init("/opt/homebrew/share/tessdata", "eng+khm", tesseract::OEM_LSTM_ONLY)) {
            throw Napi::Error::New(env, "Could not initialize tesseract.");
        }

        // After Init, add these configurations to improve font detection
        api->SetVariable("textord_ocr_engine_mode", "2");  // LSTM mode
        api->SetVariable("debug_file", "/dev/null");
        api->SetVariable("classify_enable_learning", "0");
        api->SetVariable("classify_enable_adaptive_matcher", "0");
        api->SetVariable("textord_min_xheight", "8");
        api->SetVariable("textord_min_linesize", "2");
        api->SetVariable("textord_force_make_prop_words", "F");
        
        Pix *pix = pixRead(inputFile.c_str());
        if (!pix) {
            api->End();
            throw Napi::Error::New(env, "Cannot process input file: " + inputFile);
        }

        api->SetPageSegMode(tesseract::PSM_AUTO_OSD);
        api->SetImage(pix);
        
        if (api->Recognize(0) != 0) {
            pixDestroy(&pix);
            api->End();
            throw Napi::Error::New(env, "Error during recognition");
        }

        // Use vector instead of map to maintain order
        std::vector<WordInfo> wordList;
        int currentLine = 0;
        int wordPosition = 0;
        int lastY = -1;
        const int LINE_HEIGHT_THRESHOLD = 10;

        tesseract::ResultIterator* ri = api->GetIterator();
        if (ri != 0) {
            do {
                const char* word = ri->GetUTF8Text(tesseract::RIL_WORD);
                if (word != 0) {
                    int x1, y1, x2, y2;
                    ri->BoundingBox(tesseract::RIL_WORD, &x1, &y1, &x2, &y2);

                    // Check if this is a new line based on Y position
                    if (lastY == -1 || abs(y1 - lastY) > LINE_HEIGHT_THRESHOLD) {
                        currentLine++;
                        wordPosition = 0;
                        lastY = y1;
                    }

                    // Get paragraph information
                    bool isParagraphStart = ri->IsAtBeginningOf(tesseract::RIL_BLOCK);
                    bool isParagraphEnd = ri->IsAtFinalElement(tesseract::RIL_BLOCK, tesseract::RIL_WORD);

                    const char *font_name;
                    bool bold, italic, underlined, monospace, serif, smallcaps;
                    int pointsize, font_id;
                    
                    font_name = ri->WordFontAttributes(&bold, &italic, &underlined,
                                                   &monospace, &serif,
                                                   &smallcaps, &pointsize,
                                                   &font_id);

                    // Get additional information
                    bool isSymbol = ri->SymbolIsSuperscript() || ri->SymbolIsSubscript();
                    float confidence = ri->Confidence(tesseract::RIL_WORD);
                    const char* lang = ri->WordRecognitionLanguage();

                    // Get page dimensions using Leptonica functions
                    l_int32 pageWidth = pixGetWidth(pix);
                    l_int32 pageHeight = pixGetHeight(pix);

                    // Create and store word info
                    WordInfo wordInfo;
                    wordInfo.text = word;
                    wordInfo.fontSize = pointsize;
                    wordInfo.language = lang ? lang : "unknown";
                    wordInfo.fontName = font_name ? font_name : determineFontName(lang, serif, monospace);
                    wordInfo.fontFamily = wordInfo.fontName;
                    wordInfo.bold = bold;
                    wordInfo.italic = italic;
                    wordInfo.underlined = underlined;
                    wordInfo.monospace = monospace;
                    wordInfo.serif = serif;
                    wordInfo.smallcaps = smallcaps;
                    wordInfo.isSymbol = isSymbol;
                    wordInfo.confidence = confidence;
                    wordInfo.lineNumber = currentLine;
                    wordInfo.wordPosition = wordPosition++;
                    wordInfo.isParagraphStart = isParagraphStart;
                    wordInfo.isParagraphEnd = isParagraphEnd;
                    
                    wordInfo.x = x1;
                    wordInfo.y = y1;
                    wordInfo.width = x2 - x1;
                    wordInfo.height = y2 - y1;
                    wordInfo.pageWidth = pageWidth;

                    wordList.push_back(wordInfo);
                    delete[] word;
                }
            } while (ri->Next(tesseract::RIL_WORD));
        }

        // Create result array
        Napi::Array words = Napi::Array::New(env);
        for (size_t i = 0; i < wordList.size(); i++) {
            const auto& word = wordList[i];
            Napi::Object wordObj = Napi::Object::New(env);
            wordObj.Set("text", word.text);
            wordObj.Set("fontSize", word.fontSize);
            wordObj.Set("language", word.language);
            wordObj.Set("fontName", word.fontName);
            wordObj.Set("fontFamily", word.fontFamily);
            wordObj.Set("bold", word.bold);
            wordObj.Set("italic", word.italic);
            wordObj.Set("underlined", word.underlined);
            wordObj.Set("monospace", word.monospace);
            wordObj.Set("serif", word.serif);
            wordObj.Set("smallcaps", word.smallcaps);
            wordObj.Set("isSymbol", word.isSymbol);
            wordObj.Set("confidence", word.confidence);
            wordObj.Set("lineNumber", word.lineNumber);
            wordObj.Set("wordPosition", word.wordPosition);
            wordObj.Set("x", word.x);
            wordObj.Set("y", word.y);
            wordObj.Set("width", word.width);
            wordObj.Set("height", word.height);
            wordObj.Set("pageWidth", word.pageWidth);
            
            words.Set(i, wordObj);
        }

        // Remove the unused 'result' variable and just use finalResult
        Napi::Object finalResult = Napi::Object::New(env);
        finalResult.Set("words", words);

        delete ri;
        api->End();
        pixDestroy(&pix);
        
        return finalResult;

    } catch (const std::exception& e) {
        throw Napi::Error::New(env, std::string("C++ error: ") + e.what());
    } catch (...) {
        throw Napi::Error::New(env, "Unknown C++ error occurred");
    }
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("analyzeImage", Napi::Function::New(env, AnalyzeImage));
    exports.Set("analyzeImageGrouped", Napi::Function::New(env, AnalyzeImageGrouped));
    return exports;
}

NODE_API_MODULE(tesseract, Init)