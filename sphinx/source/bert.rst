BERT Documentation
==================

:ref:`Read more <BERT>` about BERT and the state-of-the-art langauge model.

bert.train
-----------------
.. autofunction::
    bert.train.loadLatestDataset
.. autofunction::
    bert.train.buildClassifierModel
.. autofunction::
    bert.train.trainModel
.. autofunction::
    bert.train.plotHistory

bert.supabase_to_csv
-----------------
.. autofunction::
    bert.supabase_to_csv.main

bert.supabase_to_keras
-----------------
.. autofunction::
    bert.supabase_to_keras.getDatasetName

bert.supabase_to_df
-----------------
.. autofunction::
    bert.supabase_to_df.main

bert.utils
-----------------
.. autofunction::
    bert.utils.querySupabase
.. autofunction::
    bert.utils.augmentData
.. autofunction::
    bert.utils.equalizeClasses
.. autofunction::
    bert.utils.exportKerasFolder
.. autofunction::
    bert.utils.exportDfPickle