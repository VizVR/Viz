//
//  PythonInterface.h
//
//  Created by Nissim Hadar on Oct 6, 2018.
//  Copyright 2013 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
#ifndef hifi_PythonInterface_h
#define hifi_PythonInterface_h

#include <QString>

class PythonInterface {
public:
    PythonInterface();

    QString getPythonCommand();

private:
    const QString _pythonExe{ "python.exe" };
    QString _pythonCommand;
};

#endif // hifi_PythonInterface_h