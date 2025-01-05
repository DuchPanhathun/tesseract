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
};

// Helper function to sort by font size in descending order
bool compareFontSize(const std::pair<int, std::vector<WordInfo>>& a, 
                    const std::pair<int, std::vector<WordInfo>>& b) {
    return a.first > b.first;
}

Napi::Object AnalyzeImage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (info.Length() < 1) {
            throw Napi::Error::New(env, "Wrong number of arguments");
        }

        std::string inputFile = info[0].As<Napi::String>().Utf8Value();
        
        tesseract::TessBaseAPI *api = new tesseract::TessBaseAPI();
        Napi::Object result = Napi::Object::New(env);
        
        if (api->Init(NULL, "eng+khm")) {
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
        
        if (api->Init(NULL, "eng+khm")) {
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

        // Map to store words grouped by font size
        std::map<int, std::vector<WordInfo>> sizeGroups;

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

                    // Store word info
                    WordInfo wordInfo;
                    wordInfo.text = word;
                    wordInfo.fontSize = pointsize;
                    wordInfo.language = lang ? lang : "unknown";

                    // Group by font size
                    sizeGroups[pointsize].push_back(wordInfo);
                    delete[] word;
                }
            } while (ri->Next(tesseract::RIL_WORD));
        }

        // Convert grouped results to JavaScript array
        Napi::Array groupedResults = Napi::Array::New(env);
        int groupIndex = 0;

        // Convert map to vector for sorting
        std::vector<std::pair<int, std::vector<WordInfo>>> sortedGroups(
            sizeGroups.begin(), sizeGroups.end());
        
        // Sort by font size (descending)
        std::sort(sortedGroups.begin(), sortedGroups.end(), compareFontSize);

        // Create result array
        for (const auto& group : sortedGroups) {
            Napi::Object groupObj = Napi::Object::New(env);
            groupObj.Set("fontSize", group.first);

            Napi::Array texts = Napi::Array::New(env);
            int textIndex = 0;

            for (const auto& word : group.second) {
                Napi::Object wordObj = Napi::Object::New(env);
                wordObj.Set("text", word.text);
                wordObj.Set("language", word.language);
                texts.Set(textIndex++, wordObj);
            }

            groupObj.Set("words", texts);
            groupedResults.Set(groupIndex++, groupObj);
        }

        result.Set("groupedBySize", groupedResults);

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

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("analyzeImage", Napi::Function::New(env, AnalyzeImage));
    exports.Set("analyzeImageGrouped", Napi::Function::New(env, AnalyzeImageGrouped));
    return exports;
}

NODE_API_MODULE(tesseract, Init)